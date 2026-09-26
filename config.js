// Централізована конфігурація. Змінюй тут, а не в логіці сервера.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',

  // Просте "Premium" підтвердження без бази даних / оплати (тимчасово).
  // Фронтенд надсилає цей ключ у заголовку X-Premium-Key, якщо користувач Premium.
  premiumKey: process.env.PREMIUM_KEY || '',

  limits: {
    freeMaxFiles: 10,
    premiumMaxFiles: 200,
    maxFileSizeMb: 60,
    allowedExt: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
    ffmpegTimeoutMs: 60_000, // ліміт на конвертацію одного файлу
    ffmpegConcurrency: 1, // скільки треків конвертувати одночасно (не всі відразу, щоб не покласти CPU/RAM)
  },

  // Налаштування кодування .ogg (Vorbis). q:a 0-10, більше = краща якість/більший файл.
  ogg: {
    quality: 4,
    sampleRate: 44100,
  },

  // Пресети обробки звуку. Кожен — це ланцюжок ffmpeg audio filters.
  // Це стартові значення, які легко підкрутити на слух.
  presets: {
    none: { premium: false, filter: null },
    radio: { premium: true, filter: 'highpass=f=300,lowpass=f=3400,acompressor=threshold=-18dB:ratio=3' },
    cassette: { premium: true, filter: 'asetrate=44100*0.98,aresample=44100,lowpass=f=8000,acompressor=threshold=-16dB:ratio=2.5' },
    car: { premium: true, filter: 'highpass=f=150,lowpass=f=5000,acompressor=threshold=-15dB:ratio=4' },
    vintage: { premium: true, filter: 'equalizer=f=3000:t=q:w=1:g=-4,acompressor=threshold=-20dB:ratio=2' },
    heavy: { premium: true, filter: 'acrusher=bits=8:mode=log:aa=1,lowpass=f=4000' },
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 20, // максимум запитів на побудову пакета за вікно, з однієї IP
  },
};
