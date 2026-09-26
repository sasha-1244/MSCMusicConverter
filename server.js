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

    // ---- README ----
    const readmeName = mode === 'radio' ? 'README_RADIO.txt' : 'README.txt';
    const readme = buildReadme(mode, trackNames, effectivePreset, wantTexture);

    // ---- ZIP стрімінгом одразу у відповідь ----
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MSC_Music_Pack.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const folderName = mode === 'radio' ? 'Radio' : 'Music';
    oggPaths.forEach((p, i) => archive.file(p, { name: `${folderName}/track${i + 1}.ogg` }));
    archive.append(readme, { name: readmeName });

    if (wantTexture) {
      const disc = await generateTexture('disc', trackNames);
      const caseImg = await generateTexture('case', trackNames);
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

function buildReadme(mode, trackNames, preset, hasTextures) {
  const lines = [];
  if (mode === 'radio') {
    lines.push(
      'MSC MUSIC PACK — RADIO', '',
      'Цей архів містить треки для радіо у грі My Summer Car.', '',
      '1. Розпакуйте архів.',
      '2. Скопіюйте файли з папки Radio/ у теку радіо гри.',
      '3. Файли названі track1.ogg, track2.ogg і т.д. — не перейменовуйте їх.'
    );
  } else {
    lines.push(
      'MSC MUSIC PACK — MUSIC', '',
      'Цей архів містить музику для програвача дисків у грі My Summer Car.', '',
      '1. Розпакуйте архів.',
      '2. Скопіюйте файли з Music/ у теку музики гри.',
      '3. Файли названі track1.ogg, track2.ogg і т.д. — не перейменовуйте їх.'
    );
    if (hasTextures) lines.push('4. Текстуру disc.png і case.png з Textures/ використайте для оформлення диска й коробки.');
  }
  lines.push('', `Треків: ${trackNames.length}`, `Обробка звуку: ${preset}`, '', '— Згенеровано MSC Music Pack Builder');
  return lines.join('\n');
}

app.listen(config.port, () => console.log(`MSC backend running on port ${config.port}`));
