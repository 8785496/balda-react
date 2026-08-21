// UI texts of both languages. The game texts (validation messages included)
// are part of the game; the Russian set is the original's wording, the
// English one is used when the game language is switched to English.
// Everything the components render goes through Texts, so no Russian string
// stays hardcoded in the views.
import type { Lang } from './game/lang';
import type { GameError, Status } from './state/types';
import type { Difficulty } from './difficulty';
import type { ThemeId } from './theme';

export interface Texts {
  title: string;                 // document.title
  turnPlayer: string;            // the turn badge
  turnBot: string;
  botThinking: string;
  boardAria: string;
  controls: {
    submit: string;              // «Готово»
    addLetter: string;           // «Добавьте букву» — the submit's label until a letter is chosen
    cancel: string;              // «Отмена»
    restart: string;             // «Заново»
    confirm: string;             // the armed «Точно?»
    backTitle: string;           // the ⌫ button tooltip
    backLabel: string;
    restartTitle: string;
    restartArmedTitle: string;
  };
  keyboard: {
    aria: string;
    title: string;               // «Выберите букву»
    cancel: string;
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
  status(s: Status): string;
  rules: {
    title: string;               // the footer "?" link
    href: string;                // the rules page in the game's language
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
    turnPlayer: 'Ход: игрок',
    turnBot: 'Ход: компьютер',
    botThinking: 'Компьютер думает…',
    boardAria: 'Игровое поле',
    controls: {
      submit: 'Готово',
      addLetter: 'Добавьте букву',
      cancel: 'Отмена',
      restart: 'Заново',
      confirm: 'Точно?',
      backTitle: 'Убрать последнюю букву пути; с пустым путём — сменить добавленную букву',
      backLabel: 'Убрать последнюю букву пути',
      restartTitle: 'Начать игру заново',
      restartArmedTitle: 'Нажмите ещё раз — игра начнётся заново',
    },
    keyboard: {
      aria: 'Виртуальная клавиатура',
      title: 'Выберите букву',
      cancel: 'Отмена',
    },
    score: {
      progress: (n, max) => 'Слово ' + n + ' из ' + max,
      player: 'Игрок',
      computer: 'Компьютер',
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
    status(s) {
      if (s.kind === 'botMove')
        return 'Компьютер: «' + s.word + '» (+' + s.word.length + ')';
      return 'У компьютера нет хода — ваш ход';
    },
    rules: {
      title: 'Правила игры',
      href: 'https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29',
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
    turnPlayer: 'Turn: player',
    turnBot: 'Turn: computer',
    botThinking: 'Computer is thinking…',
    boardAria: 'Game board',
    controls: {
      submit: 'Done',
      addLetter: 'Add a letter',
      cancel: 'Cancel',
      restart: 'Restart',
      confirm: 'Sure?',
      backTitle: 'Remove the last letter of the path; with an empty path — change the added letter',
      backLabel: 'Remove the last letter of the path',
      restartTitle: 'Restart the game',
      restartArmedTitle: 'Tap again — the game will restart',
    },
    keyboard: {
      aria: 'On-screen keyboard',
      title: 'Choose a letter',
      cancel: 'Cancel',
    },
    score: {
      progress: (n, max) => 'Word ' + n + ' of ' + max,
      player: 'Player',
      computer: 'Computer',
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
    status(s) {
      if (s.kind === 'botMove')
        return 'Computer: "' + s.word + '" (+' + s.word.length + ')';
      return 'The computer has no move — your turn';
    },
    rules: {
      title: 'Game rules',
      href: 'https://en.wikipedia.org/wiki/Balda_(game)',
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
