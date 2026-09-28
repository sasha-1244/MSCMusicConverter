const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const archiver = require('archiver');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');

const config = require('./config');
const { convertToOgg, generateTexture } = require('./processing');
const { forLang } = require('./i18n');

const app = express();
// Render (і більшість хостингів) стоїть за проксі — без цього express-rate-limit
// не може коректно визначити IP клієнта і кидає ValidationError в логи.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '200kb' }));

const submitLimiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max });
// Окремий суворий ліміт на перевірку ключа — щоб короткий ключ не можна було підібрати перебором.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => res.status(429).json({ valid: false, error: 'Забагато спроб. Спробуй за кілька хвилин.' }),
});

function isPremiumKey(key) {
  return Boolean(config.premiumKey) && Boolean(key) && key === config.premiumKey;
}

function sanitizeName(name) {
  return String(name || 'Untitled').replace(/[\r\n\t]/g, ' ').slice(0, 80);
}

// =========================================================================
// ЧЕРГА: сервер слабкий (Free-тариф Render ~0.1 CPU), тож обробляємо
// РІВНО ОДИН пакет за раз для всіх користувачів одразу. Інші чекають і
// бачать свою позицію в черзі, замість того щоб усі одночасно вантажили CPU
// і отримували таймаути.
// =========================================================================
const jobs = new Map(); // jobId -> job object
const queue = []; // масив jobId у порядку FIFO (ще не почались)
let current = null; // job, який обробляється прямо зараз
let processingLoopRunning = false;

function getPosition(job) {
  if (current && current.id === job.id) return 0;
  const idx = queue.indexOf(job.id);
  return idx === -1 ? 0 : idx + 1;
}

function publicStatus(job) {
  return { id: job.id, status: job.status, position: getPosition(job), error: job.error || null };
}

async function cleanupJob(job) {
  jobs.delete(job.id);
  try { await fsp.rm(job.dir, { recursive: true, force: true }); } catch (_) { /* не критично */ }
}

// Прибирання «покинутих» завершених завдань, які ніхто так і не завантажив.
setInterval(() => {
  const ttlMs = 20 * 60 * 1000;
  const now = Date.now();
  for (const job of jobs.values()) {
    if ((job.status === 'done' || job.status === 'error') && now - job.finishedAt > ttlMs) {
      cleanupJob(job);
    }
  }
}, 5 * 60 * 1000).unref();

async function pump() {
  if (processingLoopRunning) return;
  let job = null;
  while (queue.length) {
    const candidate = jobs.get(queue.shift());
    if (!candidate || candidate.cancelled) continue;
    // Людина закрила вкладку, поки стояла в черзі (давно не опитувала статус) — не витрачаємо на неї CPU.
    if (Date.now() - candidate.lastSeen > config.limits.abandonedQueueMs) { cleanupJob(candidate); continue; }
    job = candidate; break;
  }
  if (!job) return;
  processingLoopRunning = true;
  current = job;
  job.status = 'processing';
  try {
    await runJob(job);
    job.status = 'done';
  } catch (err) {
    if (job.cancelled) {
      job.status = 'error';
    } else {
      console.error('job failed:', job.id, err.message);
      job.status = 'error';
      job.error = friendlyError(err.message);
    }
  } finally {
    job.finishedAt = Date.now();
    current = null;
    processingLoopRunning = false;
    if (job.cancelled) cleanupJob(job);
    pump();
  }
}

function friendlyError(msg) {
  if (msg && msg.includes('ffmpeg timeout')) {
    return 'Обробка зайняла надто багато часу (слабкий сервер). Спробуй менше файлів або простіший ефект.';
  }
  return 'Не вдалося зібрати пакет. Спробуй ще раз.';
}

// Власне обробка одного завдання: конвертація, текстура, README/TRACKLIST, ZIP на диск.
async function runJob(job) {
  const { files, mode, lang, effectivePreset, wantTexture, titles } = job.params;
  const uploadsDir = job.dir; // файли вже лежать тут (записані одразу при прийомі)
  const outDir = path.join(job.dir, 'out');
  await fsp.mkdir(outDir, { recursive: true });

  const trackNames = new Array(files.length);
  const oggPaths = new Array(files.length);

  async function processOne(i) {
    if (job.cancelled) throw new Error('cancelled');
    const f = files[i];
    const outPath = path.join(outDir, `track${i + 1}.ogg`);
    await convertToOgg(f.path, outPath, config.presets[effectivePreset].filter);
    oggPaths[i] = outPath;
    trackNames[i] = sanitizeName(titles[i] || f.baseName);
  }

  const concurrency = config.limits.ffmpegConcurrency;
  for (let start = 0; start < files.length; start += concurrency) {
    const batch = [];
    for (let i = start; i < Math.min(start + concurrency, files.length); i++) batch.push(processOne(i));
    await Promise.all(batch);
  }

  const readmeName = mode === 'radio' ? 'README_RADIO.txt' : 'README.txt';
  const readme = buildReadme(mode, trackNames, effectivePreset, wantTexture, lang);
  const tracklist = buildTracklist(trackNames, lang);

  const zipPath = path.join(job.dir, 'pack.zip');
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    out.on('close', resolve);
    out.on('error', reject);
    archive.pipe(out);

    // Одна тека = те, що треба скопіювати в гру: треки (+ coverart.png для Music-режиму).
    const folderName = mode === 'radio' ? 'Radio' : 'CD1';
    oggPaths.forEach((p, i) => archive.file(p, { name: `${folderName}/track${i + 1}.ogg` }));
    archive.append(readme, { name: readmeName });
    archive.append(tracklist, { name: 'TRACKLIST.txt' });

    if (wantTexture) {
      generateTexture(trackNames, lang)
        .then((texture) => {
          archive.append(texture, { name: `${folderName}/coverart.png` });
          archive.finalize();
        })
        .catch(reject);
    } else {
      archive.finalize();
    }
  });

  job.zipPath = zipPath;
}

function buildReadme(mode, trackNames, preset, hasTextures, lang) {
  const s = forLang(lang);
  const radio = mode === 'radio';
  const steps = radio
    ? [s.steamStep, s.radioCopyStep, s.importStep, s.radioPlayStep]
    : [s.steamStep, s.musicCopyStep, ...(hasTextures ? [s.musicTexStep] : []), s.importStep, s.musicPlayStep];
  const lines = [radio ? 'MSC MUSIC PACK — RADIO' : 'MSC MUSIC PACK — MUSIC', '', radio ? s.radioDesc : s.musicDesc, ''];
  steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('');
  if (!radio) lines.push(s.musicNote);
  lines.push(s.tracklistNote);
  lines.push('', `${s.trackCount} ${trackNames.length}`, `${s.procLabel} ${preset}`, '', s.generatedBy);
  return lines.join('\n');
}

function buildTracklist(trackNames, lang) {
  const s = forLang(lang);
  const lines = [s.tracklistTitle, ''];
  trackNames.forEach((name, i) => lines.push(`${String(i + 1).padStart(2, '0')}. ${name}`));
  return lines.join('\n');
}

// =========================================================================
// Multer: приймаємо файли в тимчасову теку одразу на диск (щоб не тримати
// в пам'яті, поки завдання чекає своєї черги).
// =========================================================================
function makeJobDir(jobId) {
  const dir = path.join(os.tmpdir(), 'msc-job-' + jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Файли пишемо одразу на диск (а не тримаємо в пам'яті): Free-тариф Render має лише 512 МБ RAM.
const incomingDir = path.join(os.tmpdir(), 'msc-incoming');
fs.mkdirSync(incomingDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, incomingDir),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: {
    fileSize: config.limits.maxFileSizeMb * 1024 * 1024,
    files: config.limits.premiumMaxFiles,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!config.limits.allowedExt.includes(ext)) return cb(new Error(`Формат .${ext} не підтримується`));
    cb(null, true);
  },
});

// Обгортка, щоб помилки multer (завеликий файл, поганий формат) повертались як JSON, а не HTML.
function receiveFiles(req, res, next) {
  upload.array('files')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? `Файл завеликий (максимум ${config.limits.maxFileSizeMb} МБ)`
      : (err.code === 'LIMIT_FILE_COUNT' ? 'Забагато файлів' : err.message);
    res.status(400).json({ error: msg });
  });
}

async function discardFiles(files) {
  await Promise.all((files || []).map((f) => fsp.rm(f.path, { force: true }).catch(() => {})));
}

// Прибираємо недозавантажені файли (клієнт закрив вкладку посеред завантаження).
setInterval(async () => {
  try {
    const now = Date.now();
    for (const name of await fsp.readdir(incomingDir)) {
      const full = path.join(incomingDir, name);
      const st = await fsp.stat(full).catch(() => null);
      if (st && now - st.mtimeMs > 30 * 60 * 1000) await fsp.rm(full, { force: true });
    }
  } catch (_) { /* не критично */ }
}, 10 * 60 * 1000).unref();

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Дозволяє фронтенду перевірити ключ ДО збірки — щоб чесно показати "Premium увімкнено",
// а не просто повірити тому, що ввів користувач.
app.post('/api/verify-key', verifyLimiter, (req, res) => {
  const key = (req.body && req.body.key) || '';
  res.json({ valid: isPremiumKey(key) });
});

app.post('/api/jobs', submitLimiter, receiveFiles, async (req, res) => {
  const files = req.files || [];
  let accepted = false;
  try {
    const premiumKeyHeader = req.header('X-Premium-Key') || '';
    const premium = isPremiumKey(premiumKeyHeader);
    const maxFiles = premium ? config.limits.premiumMaxFiles : config.limits.freeMaxFiles;

    if (files.length === 0) return res.status(400).json({ error: 'Немає файлів для обробки' });
    const totalMb = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
    if (totalMb > config.limits.maxTotalMb) {
      return res.status(400).json({ error: `Загальний розмір файлів завеликий (максимум ${config.limits.maxTotalMb} МБ)` });
    }
    if (files.length > maxFiles) {
      return res.status(400).json({ error: `Ліміт файлів: ${maxFiles}${premium ? '' : ' на Free'}` });
    }

    const queueLoad = queue.length + (current ? 1 : 0);
    if (queueLoad >= config.limits.maxQueueSize) {
      return res.status(429).json({ error: 'Сервер зараз перевантажений — забагато людей у черзі. Спробуй за кілька хвилин.' });
    }

    let titles = [];
    try { titles = JSON.parse(req.body.titles || '[]'); } catch (_) { titles = []; }

    const mode = req.body.mode === 'radio' ? 'radio' : 'music';
    const lang = ['uk', 'en', 'fi', 'pl', 'de', 'ru'].includes(req.body.lang) ? req.body.lang : 'uk';
    const requestedPreset = req.body.processing || 'none';
    const preset = config.presets[requestedPreset] ? requestedPreset : 'none';
    const presetDef = config.presets[preset];
    const effectivePreset = presetDef.premium && !premium ? 'none' : preset;
    const wantTexture = req.body.generateTexture === 'true' && mode === 'music' && premium;

    const jobId = crypto.randomUUID();
    const dir = makeJobDir(jobId);

    // Переносимо вже завантажені файли в теку завдання — вони спокійно чекатимуть у черзі.
    const savedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size === 0) return res.status(400).json({ error: `Файл ${f.originalname} порожній` });
      const filePath = path.join(dir, `in_${i}${path.extname(f.originalname).toLowerCase()}`);
      await fsp.rename(f.path, filePath);
      savedFiles.push({ path: filePath, baseName: path.basename(f.originalname, path.extname(f.originalname)) });
    }
    accepted = true;

    const job = {
      id: jobId,
      dir,
      status: 'queued',
      error: null,
      zipPath: null,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      cancelled: false,
      finishedAt: null,
      params: { files: savedFiles, mode, lang, effectivePreset, wantTexture, titles },
    };
    jobs.set(jobId, job);
    queue.push(jobId);

    pump();
    res.json(publicStatus(job));
  } catch (err) {
    console.error('job create error:', err.message);
    res.status(500).json({ error: 'Не вдалося прийняти файли. Спробуй ще раз.' });
  } finally {
    if (!accepted) await discardFiles(files); // будь-який відхилений запит не залишає файлів на диску
  }
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Завдання не знайдено (можливо, вже застаріло)' });
  job.lastSeen = Date.now();
  res.json(publicStatus(job));
});

// Скасування: з черги прибираємо одразу, а якщо вже обробляється — зупиняємось між треками.
app.delete('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.json({ ok: true });
  job.cancelled = true;
  if (job.status === 'queued') {
    const idx = queue.indexOf(job.id);
    if (idx !== -1) queue.splice(idx, 1);
    cleanupJob(job);
  } else if (job.status === 'done' || job.status === 'error') {
    cleanupJob(job);
  } // 'processing' — pump() сам прибере після зупинки
  res.json({ ok: true });
});

app.get('/api/jobs/:id/download', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'done' || !job.zipPath) {
    return res.status(400).json({ error: 'Пакет ще не готовий' });
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="MSC_Music_Pack.zip"');
  const stream = fs.createReadStream(job.zipPath);
  stream.pipe(res);
  stream.on('close', () => cleanupJob(job));
});

app.listen(config.port, () => console.log(`MSC backend running on port ${config.port}`));
