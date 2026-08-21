// All move and validation logic — a port of js/events.js to useReducer.
// Error texts and the order of checks are ported verbatim (events.validate):
//   «Слово должно содержать добавленную букву»
//   «Слово "…" уже использовано»
//   «Слово "…" не найдено» / «Добавьте букву» / «Выберите слово»
// Deliberate differences from the original:
//   - "Отмена" resets numChar (the original kept the highlight and produced a false validation error);
//   - if the computer has no move, the turn is skipped (the original crashed on an undefined access).
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
    error: '',
    status: '',
    lastBotMove: null,
  };
}

// a new game: an empty board with the starting word in the middle row
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
        // choosing an empty cell for the new letter
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
        // building the path: non-empty cells only, no repeats, adjacent to the last one
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
        numChar: state.selectedCell, // highlighted in red
        selectedCell: null,
        phase: 'word',
      };
    }

    case 'SUBMIT_MOVE': {
      if (state.phase !== 'idle' && state.phase !== 'letter' && state.phase !== 'word')
        return state;
      // in the idle/letter phases a move is impossible — «Добавьте букву», as in the original
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
      // the word is not found
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
        numChar: null, // fix: the original did not reset numChar
        selectedCell: null,
        phase: 'idle',
        error: '',
        status: '',
      };
    }

    case 'BOT_MOVED': {
      if (state.phase !== 'bot')
        return state;
      if (action.move === null) {
        // no move — the computer skips (the original crashed here)
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
