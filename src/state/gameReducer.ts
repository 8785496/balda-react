// All move and validation logic — a port of js/events.js to useReducer.
// Error texts and the order of checks are ported verbatim (events.validate):
//   «Слово должно содержать добавленную букву»
//   «Слово "…" уже использовано»
//   «Слово "…" не найдено» / «Добавьте букву» / «Выберите слово»
// Deliberate differences from the original:
//   - "Отмена" resets numChar (the original kept the highlight and produced a false validation error);
//   - if the computer has no move, the turn is skipped (the original crashed on an undefined access);
//   - a validation error keeps the track (the original cleared the whole path);
//   - the path is editable: a click on the last cell (or BACKSPACE) removes it, and a click
//     on the added letter already in the path (or BACKSPACE with an empty path) reopens the
//     keyboard to change the letter — the path and the board survive all of this.
import { ALPHABET, SIZE, START_WORD, START_ROW, MAX_WORDS } from '../game/constants';
import { dic } from '../game/dic';
import { areAdjacent, wordFromTrack } from './helpers';
import type { Action, GameState } from './types';

// a new game: an empty board with the starting word in the middle row.
// The game starts immediately — the original's "Старт" screen was dropped.
function freshGame(): GameState {
  const board: string[] = new Array(SIZE * SIZE).fill('');
  for (let i = 0; i < START_WORD.length; i++)
    board[START_ROW + i] = START_WORD[i];
  return {
    phase: 'idle',
    board,
    usedWords: [START_WORD],
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

export const initialState = freshGame();

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
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
        if (state.board[i] === '')
          return state;
        // a click on the last cell of the path removes it (a misclick undo)
        if (state.track.length > 0 && state.track[state.track.length - 1] === i)
          return { ...state, track: state.track.slice(0, -1), error: '' };
        // a click on the added letter already in the path reopens the keyboard
        // to change it; the path survives — a new letter changes the word,
        // not the cells (the letter cell itself must stay clickable to be
        // added to the path, hence only the mid-path case)
        if (state.numChar === i && state.track.indexOf(i) !== -1)
          return { ...state, selectedCell: i, phase: 'letter', error: '' };
        // building the path: non-empty cells only, no repeats, adjacent to the last one
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
      // in the idle/letter phases a move is impossible — «Добавьте букву», as in the original.
      // On any error the track is kept so the path can be edited, not rebuilt.
      if (state.numChar !== null && state.track.indexOf(state.numChar) === -1) {
        return {
          ...state,
          error: 'Слово должно содержать добавленную букву',
        };
      }
      const result = wordFromTrack(state.board, state.track);
      if (state.usedWords.indexOf(result) !== -1) {
        return {
          ...state,
          error: 'Слово "' + result + '" уже использовано',
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
      return { ...state, error };
    }

    // one step back: removes the last path cell; once the path is empty,
    // reopens the keyboard over the added letter
    case 'BACKSPACE': {
      if (state.phase !== 'word')
        return state;
      if (state.track.length > 0)
        return { ...state, track: state.track.slice(0, -1), error: '' };
      if (state.numChar !== null)
        return { ...state, selectedCell: state.numChar, phase: 'letter', error: '' };
      return state;
    }

    case 'CANCEL_MOVE': {
      if (state.phase !== 'letter' && state.phase !== 'word')
        return state;
      // canceling a letter change (the keyboard reopened over an existing move —
      // numChar is set): back to the word, the path and the letter survive
      if (state.phase === 'letter' && state.numChar !== null)
        return { ...state, selectedCell: null, phase: 'word', error: '' };
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
        // report what the computer played — until the player's next action
        status: 'Компьютер: «' + action.move.word + '» (+' + action.move.word.length + ')',
        phase: usedWords.length >= MAX_WORDS ? 'over' : 'idle',
      };
    }
  }
}
