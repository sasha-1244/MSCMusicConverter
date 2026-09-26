const { spawn } = require('child_process');
const sharp = require('sharp');
const config = require('./config');

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

// Просте екранування для тексту всередині SVG.
function escXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function truncate(label, max) {
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

// Генерує PNG-текстуру (disc або case) на основі списку назв треків.
async function generateTexture(kind, trackNames) {
  const size = 512;
  const lines = trackNames.slice(0, 14).map((name, i) => {
    const label = `${String(i + 1).padStart(2, '0')} ${name}`;
    return escXml(truncate(label, 30));
  });

  const listStartY = kind === 'disc' ? 300 : 90;
  const textEls = lines
    .map((l, i) => `<text x="86" y="${listStartY + i * 24}" font-family="monospace" font-size="16" fill="#e7ddc4">${l}</text>`)
    .join('\n');

  const discCircle = kind === 'disc'
    ? `<circle cx="256" cy="256" r="240" fill="#2a251d" stroke="#d9a441" stroke-width="3"/>
       <circle cx="256" cy="256" r="30" fill="#15130f"/>`
    : '';

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#211d17"/>
      <rect x="3" y="3" width="506" height="506" fill="none" stroke="#3c352a" stroke-width="6"/>
      ${discCircle}
      <text x="256" y="${kind === 'disc' ? 100 : 50}" font-family="monospace" font-size="26" font-weight="bold"
            text-anchor="middle" fill="#d9a441">MY SUMMER MIX</text>
      ${textEls}
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { convertToOgg, generateTexture };
