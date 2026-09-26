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

// Обидва блоки (кейс і диск) лежать в ОДНОМУ файлі-шаблоні assets/cd-template.png (512x512).
//
// "case" — картка з лініями у верхньому правому квадранті. Перший (найвищий) рядок прибрано
// на прохання — він був занадто близько до верхнього краю картки. Лишилось 11 слотів = 10
// реальних треків + 1 рядок "+N ще".
//
// "disc" — нижній правий квадрант. Диск круглий, тому смуга ліній звужується донизу: виміряно
// напряму по пікселях шаблону реальні ліві/праві межі диска в кожному рядку, тому в кожного
// рядка своя стартова X-позиція і своя максимальна ширина тексту.
const LAYOUT = {
  case: {
    lineYs: [56, 75, 94, 114, 133, 152, 172, 191, 210, 230, 249],
    x: 256 + 18, maxWidthPx: 216, fontSize: 15,
  },
  disc: {
    // локальні координати всередині квадранта диска (256,256)-(512,512); абсолютні = +256/+256
    lines: [
      { y: 162, x: 30, maxWidthPx: 206 },
      { y: 174, x: 37, maxWidthPx: 192 },
      { y: 187, x: 45, maxWidthPx: 175 },
      { y: 201, x: 55, maxWidthPx: 156 },
    ],
    fontSize: 10,
  },
};

// Формує список рядків для блоку з N слотами: якщо треків більше, ніж слотів — останній
// слот стає підсумковим "+N ще".
function buildSlotItems(slotCount, trackNames, lang) {
  const strings = forLang(lang);
  const items = [];
  if (trackNames.length <= slotCount) {
    trackNames.forEach((name, i) => items.push(`${String(i + 1).padStart(2, '0')} ${name}`));
  } else {
    trackNames.slice(0, slotCount - 1).forEach((name, i) => items.push(`${String(i + 1).padStart(2, '0')} ${name}`));
    items.push(strings.moreTracks(trackNames.length - (slotCount - 1)));
  }
  return items;
}

function buildOverlaySvg(trackNames, lang) {
  const caseItems = buildSlotItems(LAYOUT.case.lineYs.length, trackNames, lang);
  const caseTextEls = caseItems.map((label, i) => {
    const y = LAYOUT.case.lineYs[i];
    const truncated = escXml(truncateToWidth(label, LAYOUT.case.fontSize, LAYOUT.case.maxWidthPx));
    return `<text x="${LAYOUT.case.x}" y="${y - 3}" font-family="Kalam" font-size="${LAYOUT.case.fontSize}" fill="#2a2620">${truncated}</text>`;
  }).join('\n');

  const discItems = buildSlotItems(LAYOUT.disc.lines.length, trackNames, lang);
  const discTextEls = discItems.map((label, i) => {
    const l = LAYOUT.disc.lines[i];
    const truncated = escXml(truncateToWidth(label, LAYOUT.disc.fontSize, l.maxWidthPx));
    return `<text x="${256 + l.x}" y="${256 + l.y - 3}" font-family="Kalam" font-size="${LAYOUT.disc.fontSize}" fill="#2a2620">${truncated}</text>`;
  }).join('\n');

  return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">${caseTextEls}\n${discTextEls}</svg>`;
}

// Генерує ОДНУ PNG-текстуру (диск + кейс разом, як в грі) з накладеним треклистом.
async function generateTexture(trackNames, lang) {
  const overlay = Buffer.from(buildOverlaySvg(trackNames, lang));
  return sharp(TEMPLATE_PATH)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

module.exports = { convertToOgg, generateTexture };
