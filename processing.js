const { spawn } = require('child_process');
const sharp = require('sharp');
const path = require('path');
const config = require('./config');
const { forLang } = require('./i18n');

const TEMPLATE_PATH = path.join(__dirname, 'assets', 'cd-template.png');

// Запускає ffmpeg з таймаутом. inputPath -> outputPath (.ogg), опційний audio filter.
function convertToOgg(inputPath, outputPath, filterChain) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', inputPath];
    if (filterChain) args.push('-af', filterChain);
    args.push(
      '-c:a', 'libvorbis',
      '-q:a', String(config.ogg.quality),
      '-ar', String(config.ogg.sampleRate),
      outputPath
    );

    const proc = spawn('ffmpeg', args);
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ffmpeg timeout'));
    }, config.limits.ffmpegTimeoutMs);

    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

function escXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Урізає назву під приблизну ширину в пікселях (грубий підрахунок для рукописного шрифту).
function truncateToWidth(label, fontSize, maxWidthPx) {
  const avgCharPx = fontSize * 0.52;
  const maxChars = Math.max(3, Math.floor(maxWidthPx / avgCharPx));
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + '…';
}

// Координати ліній виміряні напряму по пікселях шаблону (assets/cd-template.png, 512x512).
// "case" — повне зображення 512x512 (лінії для треклиста лежать у верхньому правому квадранті).
// "disc" — нижній правий квадрант (256..512, 256..512), після crop лінії у ЛОКАЛЬНИХ координатах 0..256.
const LAYOUT = {
  case: {
    lineYs: [37, 56, 75, 94, 114, 133, 152, 172, 191, 210, 230, 249],
    x: 256 + 18, maxWidthPx: 216, fontSize: 15,
  },
  disc: {
    lineYs: [162, 174, 187, 201],
    x: 22, maxWidthPx: 200, fontSize: 10,
  },
};

function buildLinesSvg(kind, trackNames, lang) {
  const layout = LAYOUT[kind];
  const strings = forLang(lang);
  const slots = layout.lineYs.length;
  const items = [];

  if (trackNames.length <= slots) {
    trackNames.forEach((name, i) => items.push(`${String(i + 1).padStart(2, '0')} ${name}`));
  } else {
    trackNames.slice(0, slots - 1).forEach((name, i) => items.push(`${String(i + 1).padStart(2, '0')} ${name}`));
    items.push(strings.moreTracks(trackNames.length - (slots - 1)));
  }

  const textEls = items
    .map((label, i) => {
      const y = layout.lineYs[i];
      const truncated = escXml(truncateToWidth(label, layout.fontSize, layout.maxWidthPx));
      return `<text x="${layout.x}" y="${y - 3}" font-family="Kalam" font-size="${layout.fontSize}" fill="#2a2620">${truncated}</text>`;
    })
    .join('\n');

  const width = kind === 'disc' ? 256 : 512;
  const height = kind === 'disc' ? 256 : 512;
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${textEls}</svg>`;
}

// Генерує PNG-текстуру (disc або case) з накладеним треклистом поверх готового шаблону користувача.
async function generateTexture(kind, trackNames, lang) {
  const svg = buildLinesSvg(kind, trackNames, lang);
  const overlay = Buffer.from(svg);

  if (kind === 'disc') {
    return sharp(TEMPLATE_PATH)
      .extract({ left: 256, top: 256, width: 256, height: 256 })
      .composite([{ input: overlay, left: 0, top: 0 }])
      .png()
      .toBuffer();
  }
  // case — повне зображення (обкладинка + картка з лініями + задня панель), лінії малюємо у своїх координатах.
  return sharp(TEMPLATE_PATH)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

module.exports = { convertToOgg, generateTexture };
