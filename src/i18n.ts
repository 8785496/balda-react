// UI texts of both languages. The game texts (validation messages included)
// are part of the game; the Russian set is the original's wording, the
// English one is used when the game language is switched to English.
// Everything the components render goes through Texts, so no Russian string
// stays hardcoded in the views.
import type { Lang } from './game/lang';
import type { GameError } from './state/types';
import type { Difficulty } from './difficulty';
import type { ThemeId } from './theme';

// The wiki article the rules modal links to — the Russian one in both game
// languages, as the game itself is Russian in origin.
export const RULES_WIKI_URL =
  'https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29';

export interface Texts {
  title: string;                 // document.title
  turnPlayer: string;            // the turn badge on the player's side
  botThinking: string;           // the badge while the computer is thinking
  boardAria: string;
  controls: {
    cancel: string;              // «Отмена»
    restart: string;             // «Заново»
    confirm: string;             // the armed «Точно?»
    restartTitle: string;
    restartArmedTitle: string;
  };
  keyboard: {
    aria: string;
    title: string;               // «Выберите букву»
    close: string;               // the ✕ button's aria-label
  };
  score: {
    progress: (n: number, max: number) => string; // «Слово 3 из 21»
    player: string;
    computer: string;
  };
  end: {
    draw: string;
    win: string;
    lose: string;
    score: string;
    restart: string;
  };
  error(err: GameError): string;
  statusBotMove: string; // the bot's-move label; the word and points follow it, styled (StatusBar)
  statusBotSkip: string;
  word: {
    // the marker beside the popup's word — the sense its translations came from
    pos: Record<'noun' | 'adj' | 'verb' | 'adv', string>;
    noTranslation: string;       // no bundled translation for the word
    yandex: string;              // the Yandex Translate link text (the popup)
    close: string;               // the popup close button
  };
  rules: {
    title: string;               // the footer "?" button and the modal heading
    items: string[];             // the brief rules, a bullet each
    link: string;                // the wiki link text at the end
    close: string;               // the modal close button
  };
  langAria: string;              // the footer switchers
  difficultyAria: string;
  difficultyName(d: Difficulty): string;
  themeAria: string;
  themeNames: Record<ThemeId, string>;
}

export const TEXTS: Record<Lang, Texts> = {
  ru: {
    title: 'Балда (игра)',
    turnPlayer: 'Ваш ход',
    botThinking: 'Думаю…',
    boardAria: 'Игровое поле',
    controls: {
      cancel: 'Отмена',
      restart: 'Заново',
      confirm: 'Точно?',
      restartTitle: 'Начать игру заново',
      restartArmedTitle: 'Нажмите ещё раз — игра начнётся заново',
    },
    keyboard: {
      aria: 'Виртуальная клавиатура',
      title: 'Выберите букву',
      close: 'Закрыть',
    },
    score: {
      progress: (n, max) => 'Слово ' + n + ' из ' + max,
      player: 'Игрок',
      computer: 'Бот',
    },
    end: {
      draw: 'Ничья',
      win: 'Вы победили :)',
      lose: 'Вы проиграли :(',
      score: 'Счёт',
      restart: 'Заново',
    },
    error(err) {
      switch (err.code) {
        case 'noAddedLetter':
          return 'Слово должно содержать добавленную букву';
        case 'wordUsed':
          return 'Слово "' + (err.word ?? '') + '" уже использовано';
        case 'wordNotFound':
          return 'Слово "' + (err.word ?? '') + '" не найдено';
        case 'addLetter':
          return 'Добавьте букву';
        case 'chooseWord':
          return 'Выберите слово';
      }
    },
    statusBotMove: 'Бот:',
    statusBotSkip: 'У бота нет хода — ваш ход',
    word: {
      pos: { noun: 'сущ.', adj: 'прил.', verb: 'глаг.', adv: 'нареч.' },
      noTranslation: 'Перевода нет в словаре',
      yandex: 'Яндекс Переводчик',
      close: 'Закрыть',
    },
    rules: {
      title: 'Правила игры',
      items: [
        'Игра идёт на поле 5×5, в центре выложено случайное слово из 5 букв.',
        'За ход игрок добавляет одну букву в пустую клетку, соседнюю с занятой.',
        'Затем он составляет слово, проведя по клеткам, соседним по стороне, — добавленная буква обязательно входит в слово, а каждая клетка используется один раз.',
        'Слова — нарицательные существительные в начальной форме; «е» и «ё» равнозначны.',
        'Длина слова — очки за ход. Игра идёт до 21 слова (включая стартовое), побеждает набравший больше.',
      ],
      link: 'Подробнее — в русской Википедии',
      close: 'Закрыть',
    },
    langAria: 'Язык игры',
    difficultyAria: 'Сложность',
    difficultyName(d) {
      return d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно';
    },
    themeAria: 'Оформление поля',
    themeNames: { wood: 'Дерево', paper: 'Бумага', night: 'Ночь', neon: 'Неон' },
  },
  en: {
    title: 'Balda (game)',
    turnPlayer: 'Your turn',
    botThinking: 'Thinking…',
    boardAria: 'Game board',
    controls: {
      cancel: 'Cancel',
      restart: 'Restart',
      confirm: 'Sure?',
      restartTitle: 'Restart the game',
      restartArmedTitle: 'Tap again — the game will restart',
    },
    keyboard: {
      aria: 'On-screen keyboard',
      title: 'Choose a letter',
      close: 'Close',
    },
    score: {
      progress: (n, max) => 'Word ' + n + ' of ' + max,
      player: 'Player',
      computer: 'Bot',
    },
    end: {
      draw: 'Draw',
      win: 'You win :)',
      lose: 'You lose :(',
      score: 'Score',
      restart: 'Restart',
    },
    error(err) {
      switch (err.code) {
        case 'noAddedLetter':
          return 'The word must contain the added letter';
        case 'wordUsed':
          return 'The word "' + (err.word ?? '') + '" has already been used';
        case 'wordNotFound':
          return 'The word "' + (err.word ?? '') + '" is not in the dictionary';
        case 'addLetter':
          return 'Add a letter';
        case 'chooseWord':
          return 'Choose a word';
      }
    },
    statusBotMove: 'Bot:',
    statusBotSkip: 'The bot has no move — your turn',
    word: {
      pos: { noun: 'noun', adj: 'adj.', verb: 'v.', adv: 'adv.' },
      noTranslation: 'No translation in the dictionary',
      yandex: 'Yandex Translate',
      close: 'Close',
    },
    rules: {
      title: 'Game rules',
      items: [
        'The game is played on a 5×5 board, with a random 5-letter word laid out in the middle row.',
        'On a turn, a player adds one letter to an empty cell next to the occupied ones.',
        'Then a word is composed by dragging through side-adjacent cells — it must contain the added letter, and each cell is used once.',
        'Words are common nouns in their base form.',
        'A word scores its length. The game lasts until 21 words (including the starting one); the higher total wins.',
      ],
      link: 'More details — in the Russian Wikipedia',
      close: 'Close',
    },
    langAria: 'Game language',
    difficultyAria: 'Difficulty',
    difficultyName(d) {
      return d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard';
    },
    themeAria: 'Board theme',
    themeNames: { wood: 'Wood', paper: 'Paper', night: 'Night', neon: 'Neon' },
  },
};
