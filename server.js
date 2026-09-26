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
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '200kb' }));

const buildLimiter = rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max });

// ---- Тимчасова папка для однієї сесії/збірки ----
function makeSessionDir() {
  const dir = path.join(os.tmpdir(), 'msc-session-' + crypto.randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function cleanup(dir) {
  try { await fsp.rm(dir, { recursive: true, force: true }); } catch (_) { /* не критично */ }
}

// ---- Multer: приймаємо файли на диск у сесійну теку з випадковими іменами ----
const upload = multer({
  storage: multer.memoryStorage(), // невеликі аудіо для MVP тримаємо в пам'яті, пишемо на диск самі нижче
  limits: {
    fileSize: config.limits.maxFileSizeMb * 1024 * 1024,
    files: config.limits.premiumMaxFiles,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!config.limits.allowedExt.includes(ext)) {
      return cb(new Error(`Формат .${ext} не підтримується`));
    }
    cb(null, true);
  },
});

function isPremium(req) {
  if (!config.premiumKey) return false; // якщо ключ не налаштований на сервері — Premium вимкнено для всіх
  const key = req.header('X-Premium-Key');
  return Boolean(key) && key === config.premiumKey;
}

function sanitizeName(name) {
  // Прибираємо все, крім звичайних символів — назва йде тільки в текст README/текстур, не у файлову систему.
  return String(name || 'Untitled').replace(/[\r\n\t]/g, ' ').slice(0, 80);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/build', buildLimiter, upload.array('files'), async (req, res) => {
  const sessionDir = makeSessionDir();
  try {
    const premium = isPremium(req);
    const files = req.files || [];
    const maxFiles = premium ? config.limits.premiumMaxFiles : config.limits.freeMaxFiles;

    if (files.length === 0) {
      return res.status(400).json({ error: 'Немає файлів для обробки' });
    }
    if (files.length > maxFiles) {
      return res.status(400).json({ error: `Ліміт файлів: ${maxFiles}${premium ? '' : ' на Free'}` });
    }

    // Порядок файлів = порядок масиву (фронтенд вже надсилає у фінальному порядку треків).
    let titles = [];
    try { titles = JSON.parse(req.body.titles || '[]'); } catch (_) { titles = []; }

    const mode = req.body.mode === 'radio' ? 'radio' : 'music';
    const lang = ['uk', 'en', 'fi', 'pl', 'de'].includes(req.body.lang) ? req.body.lang : 'uk';
    const requestedPreset = req.body.processing || 'none';
    const preset = config.presets[requestedPreset] ? requestedPreset : 'none';
    const presetDef = config.presets[preset];

    // Сервер сам вирішує, чи дозволена обробка — фронтенду тут не довіряємо.
    const effectivePreset = presetDef.premium && !premium ? 'none' : preset;
    const wantTexture = req.body.generateTexture === 'true' && mode === 'music' && premium;

    const uploadsDir = path.join(sessionDir, 'uploads');
    const outDir = path.join(sessionDir, 'out');
    await fsp.mkdir(uploadsDir, { recursive: true });
    await fsp.mkdir(outDir, { recursive: true });

    const trackNames = [];
    const oggPaths = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size === 0) throw new Error(`Файл ${file.originalname} порожній`);
      const inPath = path.join(uploadsDir, `in_${i}${path.extname(file.originalname)}`);
      await fsp.writeFile(inPath, file.buffer);

      const outPath = path.join(outDir, `track${i + 1}.ogg`);
      await convertToOgg(inPath, outPath, config.presets[effectivePreset].filter);
      oggPaths.push(outPath);

      const title = sanitizeName(titles[i] || path.basename(file.originalname, path.extname(file.originalname)));
      trackNames.push(title);
    }

    // ---- README + TRACKLIST (два окремих файли, локалізовані) ----
    const readmeName = mode === 'radio' ? 'README_RADIO.txt' : 'README.txt';
    const readme = buildReadme(mode, trackNames, effectivePreset, wantTexture, lang);
    const tracklist = buildTracklist(trackNames, lang);

    // ---- ZIP стрімінгом одразу у відповідь ----
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MSC_Music_Pack.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const folderName = mode === 'radio' ? 'Radio' : 'Music';
    oggPaths.forEach((p, i) => archive.file(p, { name: `${folderName}/track${i + 1}.ogg` }));
    archive.append(readme, { name: readmeName });
    archive.append(tracklist, { name: 'TRACKLIST.txt' });

    if (wantTexture) {
      const disc = await generateTexture('disc', trackNames, lang);
      const caseImg = await generateTexture('case', trackNames, lang);
      archive.append(disc, { name: 'Textures/disc.png' });
      archive.append(caseImg, { name: 'Textures/case.png' });
    }

    await archive.finalize();
  } catch (err) {
    console.error('build error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Не вдалося зібрати пакет. Спробуйте ще раз.' });
  } finally {
    cleanup(sessionDir);
  }
});

function buildReadme(mode, trackNames, preset, hasTextures, lang) {
  const s = forLang(lang);
  const lines = [...(mode === 'radio' ? s.radioIntro : s.musicIntro)];
  if (mode === 'music' && hasTextures) lines.push(s.musicTexLine);
  lines.push('', `${s.trackCount} ${trackNames.length}`, `${s.procLabel} ${preset}`, '', s.generatedBy);
  return lines.join('\n');
}

function buildTracklist(trackNames, lang) {
  const s = forLang(lang);
  const lines = [s.tracklistTitle, ''];
  trackNames.forEach((name, i) => lines.push(`${String(i + 1).padStart(2, '0')}. ${name}`));
  return lines.join('\n');
}

app.listen(config.port, () => console.log(`MSC backend running on port ${config.port}`));
