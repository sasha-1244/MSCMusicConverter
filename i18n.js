// Локалізовані шаблони для README.txt / TRACKLIST.txt / підпису "+N ще треків" на текстурах.
// Мова приходить з фронтенду (те саме, що обрав користувач у селекторі мов).

const DICT = {
  uk: {
    musicIntro: ['MSC MUSIC PACK — MUSIC', '', 'Цей архів містить музику для програвача дисків у грі My Summer Car.', '',
      '1. Розпакуйте архів.', '2. Скопіюйте файли з Music/ у теку музики гри.', '3. Файли названі track1.ogg, track2.ogg і т.д. — не перейменовуйте їх.',
      '4. Список треків — у файлі TRACKLIST.txt.'],
    musicTexLine: '5. Текстуру texture.png з Textures/ використайте для оформлення диска й коробки.',
    radioIntro: ['MSC MUSIC PACK — RADIO', '', 'Цей архів містить треки для радіо у грі My Summer Car.', '',
      '1. Розпакуйте архів.', '2. Скопіюйте файли з папки Radio/ у теку радіо гри.', '3. Файли названі track1.ogg, track2.ogg і т.д. — не перейменовуйте їх.',
      '4. Список треків — у файлі TRACKLIST.txt.'],
    trackCount: 'Треків:', procLabel: 'Обробка звуку:', generatedBy: '— Згенеровано MSC Music Pack Builder',
    tracklistTitle: 'СПИСОК ТРЕКІВ', moreTracks: (n) => `+ ще ${n} трек(ів)`,
  },
  en: {
    musicIntro: ['MSC MUSIC PACK — MUSIC', '', 'This archive contains music for the disc player in My Summer Car.', '',
      '1. Unpack the archive.', '2. Copy the files from Music/ into the game music folder.', '3. Files are named track1.ogg, track2.ogg etc. — do not rename them.',
      '4. The track list is in TRACKLIST.txt.'],
    musicTexLine: '5. Use texture.png from Textures/ to decorate the disc and case.',
    radioIntro: ['MSC MUSIC PACK — RADIO', '', 'This archive contains tracks for the in-game radio in My Summer Car.', '',
      '1. Unpack the archive.', '2. Copy the files from Radio/ into the radio folder.', '3. Files are named track1.ogg, track2.ogg etc. — do not rename them.',
      '4. The track list is in TRACKLIST.txt.'],
    trackCount: 'Tracks:', procLabel: 'Audio processing:', generatedBy: '— Generated with MSC Music Pack Builder',
    tracklistTitle: 'TRACKLIST', moreTracks: (n) => `+ ${n} more track(s)`,
  },
  fi: {
    musicIntro: ['MSC MUSIC PACK — MUSIC', '', 'Tämä paketti sisältää musiikkia levysoittimeen pelissä My Summer Car.', '',
      '1. Pura paketti.', '2. Kopioi tiedostot Music/-kansiosta pelin musiikkikansioon.', '3. Tiedostot on nimetty track1.ogg, track2.ogg jne. — älä nimeä niitä uudelleen.',
      '4. Kappalelista on tiedostossa TRACKLIST.txt.'],
    musicTexLine: '5. Käytä texture.png (Textures/) levyn ja kotelon ulkoasuun.',
    radioIntro: ['MSC MUSIC PACK — RADIO', '', 'Tämä paketti sisältää kappaleita pelin radioon (My Summer Car).', '',
      '1. Pura paketti.', '2. Kopioi tiedostot Radio/-kansiosta radion kansioon.', '3. Tiedostot on nimetty track1.ogg, track2.ogg jne. — älä nimeä niitä uudelleen.',
      '4. Kappalelista on tiedostossa TRACKLIST.txt.'],
    trackCount: 'Kappaleita:', procLabel: 'Äänenkäsittely:', generatedBy: '— Luotu MSC Music Pack Builderilla',
    tracklistTitle: 'KAPPALELISTA', moreTracks: (n) => `+ ${n} kappaletta lisää`,
  },
  pl: {
    musicIntro: ['MSC MUSIC PACK — MUSIC', '', 'To archiwum zawiera muzykę do odtwarzacza płyt w My Summer Car.', '',
      '1. Rozpakuj archiwum.', '2. Skopiuj pliki z Music/ do folderu muzyki gry.', '3. Pliki są nazwane track1.ogg, track2.ogg itd. — nie zmieniaj ich nazw.',
      '4. Lista utworów znajduje się w TRACKLIST.txt.'],
    musicTexLine: '5. Użyj texture.png z Textures/ do wyglądu płyty i pudełka.',
    radioIntro: ['MSC MUSIC PACK — RADIO', '', 'To archiwum zawiera utwory do radia w My Summer Car.', '',
      '1. Rozpakuj archiwum.', '2. Skopiuj pliki z Radio/ do folderu radia.', '3. Pliki są nazwane track1.ogg, track2.ogg itd. — nie zmieniaj ich nazw.',
      '4. Lista utworów znajduje się w TRACKLIST.txt.'],
    trackCount: 'Utworów:', procLabel: 'Przetwarzanie dźwięku:', generatedBy: '— Wygenerowano w MSC Music Pack Builder',
    tracklistTitle: 'LISTA UTWORÓW', moreTracks: (n) => `+ ${n} więcej utworów`,
  },
  de: {
    musicIntro: ['MSC MUSIC PACK — MUSIC', '', 'Dieses Archiv enthält Musik für den Disc-Player in My Summer Car.', '',
      '1. Archiv entpacken.', '2. Dateien aus Music/ in den Musikordner des Spiels kopieren.', '3. Dateien heißen track1.ogg, track2.ogg usw. — nicht umbenennen.',
      '4. Die Titelliste steht in TRACKLIST.txt.'],
    musicTexLine: '5. texture.png aus Textures/ für Disc und Hülle verwenden.',
    radioIntro: ['MSC MUSIC PACK — RADIO', '', 'Dieses Archiv enthält Tracks für das Radio in My Summer Car.', '',
      '1. Archiv entpacken.', '2. Dateien aus Radio/ in den Radio-Ordner kopieren.', '3. Dateien heißen track1.ogg, track2.ogg usw. — nicht umbenennen.',
      '4. Die Titelliste steht in TRACKLIST.txt.'],
    trackCount: 'Tracks:', procLabel: 'Audioverarbeitung:', generatedBy: '— Erstellt mit MSC Music Pack Builder',
    tracklistTitle: 'TITELLISTE', moreTracks: (n) => `+ ${n} weitere Titel`,
  },
};

function forLang(lang) {
  return DICT[lang] || DICT.uk;
}

module.exports = { forLang };
