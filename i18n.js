// Локалізовані тексти для README.txt / TRACKLIST.txt / підпису "+N ще треків" на текстурі.
// Мова приходить з фронтенду (та сама, що вибрана в селекторі мов).
//
// Структура архіву:
//   Music-режим: CD1/ (trackN.ogg + coverart.png), README.txt, TRACKLIST.txt
//   Radio-режим: Radio/ (trackN.ogg), README_RADIO.txt, TRACKLIST.txt
// Кроки встановлення звірені з форумами Steam і Nexus Mods: теки CD1/CD2/CD3 (до 40 треків),
// Radio (до 199 треків), текстура диска — файл coverart.png в теці CD.

const DICT = {
  uk: {
    musicDesc: 'Цей архів містить музику для CD-програвача в My Summer Car.',
    radioDesc: 'Цей архів містить треки для бортового радіо в My Summer Car.',
    steamStep: 'У Steam: правою кнопкою на My Summer Car → Manage → Browse local files (відкриє папку гри).',
    musicCopyStep: 'Скопіюй теку CD1 з архіву в папку гри (на запит про заміну файлів — погодься). Хочеш інший слот — спершу перейменуй теку на CD2 або CD3 (у грі 3 CD-слоти; до 40 треків на CD).',
    musicTexStep: 'У теці вже лежить coverart.png — власна текстура диска й коробки. Перейменовувати нічого не треба.',
    radioCopyStep: 'Скопіюй теку Radio з архіву в папку гри (на запит про заміну файлів — погодься; до 199 треків).',
    importStep: 'Запусти гру й на головному меню (перед завантаженням збереження) натисни "Import Music".',
    musicPlayStep: 'У грі візьми CD і встав його в CD-програвач машини.',
    radioPlayStep: 'У машині перемкни радіо на другу станцію — там і будуть твої треки.',
    musicNote: 'Порада: якщо в цій теці гри лежать старі треки, які тобі не потрібні — видали їх, інакше вони лишаться поряд з новими.',
    tracklistNote: 'Список треків — у файлі TRACKLIST.txt.',
    trackCount: 'Треків:', procLabel: 'Обробка звуку:', generatedBy: '— Згенеровано MSC Music Pack Builder',
    tracklistTitle: 'СПИСОК ТРЕКІВ', moreTracks: (n) => `+ ще ${n} трек(ів)`,
  },
  en: {
    musicDesc: 'This archive contains music for the CD player in My Summer Car.',
    radioDesc: 'This archive contains tracks for the in-car radio in My Summer Car.',
    steamStep: 'In Steam: right-click My Summer Car → Manage → Browse local files (opens the game folder).',
    musicCopyStep: 'Copy the CD1 folder from the archive into the game folder (agree if asked to replace files). Want a different slot? Rename the folder to CD2 or CD3 first (the game has 3 CD slots; up to 40 tracks per CD).',
    musicTexStep: 'The folder already contains coverart.png — your custom disc and case texture. No renaming needed.',
    radioCopyStep: 'Copy the Radio folder from the archive into the game folder (agree if asked to replace files; up to 199 tracks).',
    importStep: 'Launch the game and click "Import Music" on the main menu (before loading your save).',
    musicPlayStep: 'In-game, take the CD and put it into the car\'s CD player.',
    radioPlayStep: 'In the car, tune the radio to the second station — your tracks play there.',
    musicNote: 'Tip: if that game folder holds old tracks you no longer want, delete them first — otherwise they stay next to the new ones.',
    tracklistNote: 'The track list is in TRACKLIST.txt.',
    trackCount: 'Tracks:', procLabel: 'Audio processing:', generatedBy: '— Generated with MSC Music Pack Builder',
    tracklistTitle: 'TRACKLIST', moreTracks: (n) => `+ ${n} more track(s)`,
  },
  fi: {
    musicDesc: 'Tämä paketti sisältää musiikkia CD-soittimeen pelissä My Summer Car.',
    radioDesc: 'Tämä paketti sisältää kappaleita auton radioon pelissä My Summer Car.',
    steamStep: 'Steamissa: hiiren oikea My Summer Car → Manage → Browse local files (avaa pelin kansion).',
    musicCopyStep: 'Kopioi CD1-kansio paketista pelin kansioon (hyväksy tiedostojen korvaus, jos kysytään). Haluatko toisen paikan? Nimeä kansio ensin CD2:ksi tai CD3:ksi (pelissä on 3 CD-paikkaa; enintään 40 kappaletta per CD).',
    musicTexStep: 'Kansiossa on jo coverart.png — oma levyn ja kotelon tekstuurisi. Uudelleennimeämistä ei tarvita.',
    radioCopyStep: 'Kopioi Radio-kansio paketista pelin kansioon (hyväksy tiedostojen korvaus, jos kysytään; enintään 199 kappaletta).',
    importStep: 'Käynnistä peli ja paina "Import Music" päävalikossa (ennen tallennuksen lataamista).',
    musicPlayStep: 'Ota pelissä CD ja laita se auton CD-soittimeen.',
    radioPlayStep: 'Viritä auton radio toiselle asemalle — kappaleesi soivat siellä.',
    musicNote: 'Vinkki: jos pelin kansiossa on vanhoja kappaleita, joita et halua, poista ne ensin — muuten ne jäävät uusien viereen.',
    tracklistNote: 'Kappalelista on tiedostossa TRACKLIST.txt.',
    trackCount: 'Kappaleita:', procLabel: 'Äänenkäsittely:', generatedBy: '— Luotu MSC Music Pack Builderilla',
    tracklistTitle: 'KAPPALELISTA', moreTracks: (n) => `+ ${n} kappaletta lisää`,
  },
  pl: {
    musicDesc: 'To archiwum zawiera muzykę do odtwarzacza CD w My Summer Car.',
    radioDesc: 'To archiwum zawiera utwory do radia samochodowego w My Summer Car.',
    steamStep: 'W Steam: kliknij prawym na My Summer Car → Manage → Browse local files (otworzy folder gry).',
    musicCopyStep: 'Skopiuj folder CD1 z archiwum do folderu gry (zgódź się na zamianę plików, jeśli gra zapyta). Chcesz inny slot? Najpierw zmień nazwę folderu na CD2 lub CD3 (gra ma 3 sloty CD; do 40 utworów na CD).',
    musicTexStep: 'W folderze jest już coverart.png — twoja tekstura płyty i pudełka. Nie trzeba niczego zmieniać.',
    radioCopyStep: 'Skopiuj folder Radio z archiwum do folderu gry (zgódź się na zamianę plików; do 199 utworów).',
    importStep: 'Uruchom grę i kliknij "Import Music" w menu głównym (przed wczytaniem zapisu).',
    musicPlayStep: 'W grze weź płytę CD i włóż ją do odtwarzacza CD w samochodzie.',
    radioPlayStep: 'W samochodzie przełącz radio na drugą stację — tam grają twoje utwory.',
    musicNote: 'Wskazówka: jeśli w tym folderze gry są stare utwory, których nie chcesz, usuń je najpierw — inaczej zostaną obok nowych.',
    tracklistNote: 'Lista utworów znajduje się w TRACKLIST.txt.',
    trackCount: 'Utworów:', procLabel: 'Przetwarzanie dźwięku:', generatedBy: '— Wygenerowano w MSC Music Pack Builder',
    tracklistTitle: 'LISTA UTWORÓW', moreTracks: (n) => `+ ${n} więcej utworów`,
  },
  de: {
    musicDesc: 'Dieses Archiv enthält Musik für den CD-Player in My Summer Car.',
    radioDesc: 'Dieses Archiv enthält Tracks für das Autoradio in My Summer Car.',
    steamStep: 'In Steam: Rechtsklick auf My Summer Car → Manage → Browse local files (öffnet den Spielordner).',
    musicCopyStep: 'Kopiere den Ordner CD1 aus dem Archiv in den Spielordner (Ersetzen bestätigen, falls gefragt). Anderer Slot gewünscht? Benenne den Ordner vorher in CD2 oder CD3 um (das Spiel hat 3 CD-Plätze; bis zu 40 Titel pro CD).',
    musicTexStep: 'Im Ordner liegt bereits coverart.png — deine eigene Disc- und Hüllen-Textur. Umbenennen ist nicht nötig.',
    radioCopyStep: 'Kopiere den Ordner Radio aus dem Archiv in den Spielordner (Ersetzen bestätigen; bis zu 199 Titel).',
    importStep: 'Spiel starten und im Hauptmenü "Import Music" klicken (vor dem Laden des Spielstands).',
    musicPlayStep: 'Nimm im Spiel die CD und lege sie in den CD-Player des Autos ein.',
    radioPlayStep: 'Im Auto das Radio auf den zweiten Sender stellen — dort laufen deine Tracks.',
    musicNote: 'Tipp: Liegen in diesem Spielordner alte Titel, die du nicht mehr willst, lösche sie zuerst — sonst bleiben sie neben den neuen.',
    tracklistNote: 'Die Titelliste steht in TRACKLIST.txt.',
    trackCount: 'Tracks:', procLabel: 'Audioverarbeitung:', generatedBy: '— Erstellt mit MSC Music Pack Builder',
    tracklistTitle: 'TITELLISTE', moreTracks: (n) => `+ ${n} weitere Titel`,
  },
  ru: {
    musicDesc: 'Этот архив содержит музыку для CD-плеера в My Summer Car.',
    radioDesc: 'Этот архив содержит треки для радио в машине в My Summer Car.',
    steamStep: 'В Steam: правой кнопкой на My Summer Car → Manage → Browse local files (откроет папку игры).',
    musicCopyStep: 'Скопируй папку CD1 из архива в папку игры (на запрос о замене файлов — согласись). Нужен другой слот — сначала переименуй папку в CD2 или CD3 (в игре 3 CD-слота; до 40 треков на CD).',
    musicTexStep: 'В папке уже лежит coverart.png — своя текстура диска и коробки. Переименовывать ничего не нужно.',
    radioCopyStep: 'Скопируй папку Radio из архива в папку игры (на запрос о замене файлов — согласись; до 199 треков).',
    importStep: 'Запусти игру и в главном меню (перед загрузкой сохранения) нажми "Import Music".',
    musicPlayStep: 'В игре возьми CD и вставь его в CD-плеер машины.',
    radioPlayStep: 'В машине переключи радио на вторую станцию — там и будут твои треки.',
    musicNote: 'Совет: если в этой папке игры лежат старые треки, которые тебе не нужны, удали их — иначе они останутся рядом с новыми.',
    tracklistNote: 'Список треков — в файле TRACKLIST.txt.',
    trackCount: 'Треков:', procLabel: 'Обработка звука:', generatedBy: '— Сгенерировано в MSC Music Pack Builder',
    tracklistTitle: 'СПИСОК ТРЕКОВ', moreTracks: (n) => `+ ещё ${n} трек(ов)`,
  },
};

function forLang(lang) {
  return DICT[lang] || DICT.uk;
}

module.exports = { forLang };
