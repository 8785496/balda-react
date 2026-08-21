// Вся логика ходов и валидации — перенос js/events.js на useReducer.
// Тексты ошибок и порядок проверок перенесены дословно (events.validate):
//   «Слово должно содержать добавленную букву»
//   «Слово "…" уже использовано»
//   «Слово "…" не найдено» / «Добавьте букву» / «Выберите слово»
// Отличия от оригинала (планомерные исправления):
//   - «Отмена» сбрасывает numChar (в оригинале оставалась подсветка и ложная ошибка);
//   - если у компьютера нет хода, ход пропускается (в оригинале падало обращение к undefined).
import { ALPHABET, SIZE, START_WORD, START_ROW, MAX_WORDS } from '../game/constants';
import { dic } from '../game/dic';
import { areAdjacent, wordFromTrack } from './helpers';
import type { Action, GameState } from './types';

function createInitialState(): GameState {
  return {
    phase: 'menu',
    board: new Array(SIZE * SIZE).fill(''),
    usedWords: [],
    playerWords: [],
    botWords: [],
    selectedCell: null,
    numChar: null,
    track: [],
    boardBackup: null,
    result: '',
    error: '',
    status: '',
    lastBotMove: null,
  };
}

// новая партия: пустое поле со стартовым словом в средней строке
function freshGame(): GameState {
  const board: string[] = new Array(SIZE * SIZE).fill('');
  for (let i = 0; i < START_WORD.length; i++)
    board[START_ROW + i] = START_WORD[i];
  return {
    ...createInitialState(),
    phase: 'idle',
    board,
    usedWords: [START_WORD],
  };
}

export const initialState = createInitialState();

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
    case 'NEW_GAME':
      return freshGame();

    case 'CLICK_CELL': {
      const i = action.index;
      if (state.phase === 'idle') {
        // выбор пустой клетки для новой буквы
        if (state.board[i] !== '')
          return state;
        return {
          ...state,
          selectedCell: i,
          boardBackup: state.board.slice(),
          phase: 'letter',
          error: '',
          status: '',
        };
      }
      if (state.phase === 'word') {
        // задание пути: только непустая клетка, без повторов, смежная с последней
        if (state.board[i] === '')
          return state;
        if (state.track.indexOf(i) !== -1)
          return state;
        if (state.track.length > 0 && !areAdjacent(state.track[state.track.length - 1], i))
          return state;
        const track = state.track.concat([i]);
        return {
          ...state,
          track,
          result: wordFromTrack(state.board, track),
          error: '',
        };
      }
      return state;
    }

    case 'SET_LETTER': {
      if (state.phase !== 'letter' || state.selectedCell === null)
        return state;
      if (ALPHABET.indexOf(action.char) === -1)
        return state;
      const board = state.board.slice();
      board[state.selectedCell] = action.char;
      return {
        ...state,
        board,
        numChar: state.selectedCell, // подсветка красным
        selectedCell: null,
        phase: 'word',
      };
    }

    case 'SUBMIT_MOVE': {
      if (state.phase !== 'idle' && state.phase !== 'letter' && state.phase !== 'word')
        return state;
      // в фазах idle/letter ход невозможен — как в оригинале, «Добавьте букву»
      if (state.numChar !== null && state.track.indexOf(state.numChar) === -1) {
        return {
          ...state,
          error: 'Слово должно содержать добавленную букву',
          track: [],
        };
      }
      const result = wordFromTrack(state.board, state.track);
      if (state.usedWords.indexOf(result) !== -1) {
        return {
          ...state,
          error: 'Слово "' + result + '" уже использовано',
          track: [],
        };
      }
      if (dic.findWord(result)) {
        const usedWords = state.usedWords.concat([result]);
        return {
          ...state,
          usedWords,
          playerWords: state.playerWords.concat([result]),
          track: [],
          numChar: null,
          boardBackup: null,
          error: '',
          status: '',
          phase: usedWords.length >= MAX_WORDS ? 'over' : 'bot',
        };
      }
      // слово не найдено
      let error: string;
      if (state.numChar === null)
        error = 'Добавьте букву';
      else if (result.length > 1)
        error = 'Слово "' + result + '" не найдено';
      else
        error = 'Выберите слово';
      return { ...state, track: [], error };
    }

    case 'CANCEL_MOVE': {
      if (state.phase !== 'letter' && state.phase !== 'word')
        return state;
      return {
        ...state,
        board: state.boardBackup !== null ? state.boardBackup.slice() : state.board,
        boardBackup: null,
        track: [],
        numChar: null, // фикс: в оригинале numChar не сбрасывался
        selectedCell: null,
        phase: 'idle',
        result: '',
        error: '',
        status: '',
      };
    }

    case 'BOT_MOVED': {
      if (state.phase !== 'bot')
        return state;
      if (action.move === null) {
        // хода нет — компьютер пропускает (в оригинале здесь было падение)
        return {
          ...state,
          phase: 'idle',
          status: 'У компьютера нет хода — ваш ход',
        };
      }
      const board = state.board.slice();
      board[action.move.index] = action.move.char;
      const usedWords = state.usedWords.concat([action.move.word]);
      return {
        ...state,
        board,
        usedWords,
        botWords: state.botWords.concat([action.move.word]),
        lastBotMove: action.move,
        phase: usedWords.length >= MAX_WORDS ? 'over' : 'idle',
      };
    }
  }
}
