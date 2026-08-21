// All move and validation logic — a port of js/events.js to useReducer.
// The checks and their order are ported verbatim (events.validate); the error
// texts are kept as structured codes (state/types.ts) and rendered in the
// current language by the view (i18n.ts). The Russian renderings:
//   «Слово должно содержать добавленную букву»        — noAddedLetter
//   «Слово "…" уже использовано»                       — wordUsed
//   «Слово "…" не найдено» / «Добавьте букву» / «Выберите слово»
//                                                        — wordNotFound / addLetter / chooseWord
// Deliberate differences from the original:
//   - "Отмена" resets numChar (the original kept the highlight and produced a false validation error);
//   - if the computer has no move, the turn is skipped (the original crashed on an undefined access);
//   - a validation error keeps the track (the original cleared the whole path);
//   - the path is editable: a click on the last cell (or BACKSPACE) removes it, and a click
//     on the added letter already in the path (or BACKSPACE with an empty path) reopens the
//     keyboard to change the letter — the path and the board survive all of this;
//   - in the letter phase a click on another empty cell moves the pending letter there
//     (the floating keyboard sits at the cell, so the field around it stays clickable);
//   - an empty cell with no letters around it cannot be chosen for the new letter
//     (the original allowed any empty cell, and an isolated letter could enter no word).
import { SIZE, START_ROW, MAX_WORDS } from '../game/constants';
import { alphabetFor, dicFor, startWordFor, type Lang } from '../game/lang';
import { areAdjacent, hasFilledNeighbor, wordFromTrack } from './helpers';
import type { Action, GameState } from './types';

// a new game: an empty board with the starting word in the middle row —
// a random 5-letter dictionary word, unless one is forced (check.ts pins
// a fixed word for its reference positions). The game starts immediately —
// the original's "Старт" screen was dropped.
export function freshGame(lang: Lang, startWord = startWordFor(lang)): GameState {
  const board: string[] = new Array(SIZE * SIZE).fill('');
  for (let i = 0; i < startWord.length; i++)
    board[START_ROW + i] = startWord[i];
  return {
    lang,
    phase: 'idle',
    board,
    usedWords: [startWord],
    playerWords: [],
    botWords: [],
    selectedCell: null,
    numChar: null,
    track: [],
    boardBackup: null,
    error: null,
    status: null,
    lastBotMove: null,
  };
}

export const initialState = freshGame('ru');

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return freshGame(action.lang ?? state.lang);

    case 'CLICK_CELL': {
      const i = action.index;
      if (state.phase === 'idle') {
        // choosing an empty cell for the new letter — only one that adjoins
        // existing letters (an isolated letter could not enter any word)
        if (state.board[i] !== '' || !hasFilledNeighbor(state.board, i))
          return state;
        return {
          ...state,
          selectedCell: i,
          boardBackup: state.board.slice(),
          phase: 'letter',
          error: null,
          status: null,
        };
      }
      if (state.phase === 'letter') {
        // the keyboard is open for a fresh cell: a tap on another empty cell
        // moves the pending letter there (the board stays visible). Not in the
        // letter-change back-transition — there the cell is fixed by the move
        // being edited (numChar is set), and the board backup still matches.
        if (state.numChar === null && state.board[i] === '' && hasFilledNeighbor(state.board, i))
          return { ...state, selectedCell: i };
        return state;
      }
      if (state.phase === 'word') {
        if (state.board[i] === '')
          return state;
        // a click on the last cell of the path removes it (a misclick undo)
        if (state.track.length > 0 && state.track[state.track.length - 1] === i)
          return { ...state, track: state.track.slice(0, -1), error: null };
        // a click on the added letter already in the path reopens the keyboard
        // to change it; the path survives — a new letter changes the word,
        // not the cells (the letter cell itself must stay clickable to be
        // added to the path, hence only the mid-path case)
        if (state.numChar === i && state.track.indexOf(i) !== -1)
          return { ...state, selectedCell: i, phase: 'letter', error: null };
        // building the path: non-empty cells only, no repeats, adjacent to the last one
        if (state.track.indexOf(i) !== -1)
          return state;
        if (state.track.length > 0 && !areAdjacent(state.track[state.track.length - 1], i))
          return state;
        const track = state.track.concat([i]);
        return {
          ...state,
          track,
          error: null,
        };
      }
      return state;
    }

    case 'SET_LETTER': {
      if (state.phase !== 'letter' || state.selectedCell === null)
        return state;
      if (alphabetFor(state.lang).indexOf(action.char) === -1)
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
          error: { code: 'noAddedLetter' },
        };
      }
      const result = wordFromTrack(state.board, state.track);
      if (state.usedWords.indexOf(result) !== -1) {
        return {
          ...state,
          error: { code: 'wordUsed', word: result },
        };
      }
      if (dicFor(state.lang).findWord(result)) {
        const usedWords = state.usedWords.concat([result]);
        return {
          ...state,
          usedWords,
          playerWords: state.playerWords.concat([result]),
          track: [],
          numChar: null,
          boardBackup: null,
          error: null,
          status: null,
          phase: usedWords.length >= MAX_WORDS ? 'over' : 'bot',
        };
      }
      // the word is not found
      let error;
      if (state.numChar === null)
        error = { code: 'addLetter' as const };
      else if (result.length > 1)
        error = { code: 'wordNotFound' as const, word: result };
      else
        error = { code: 'chooseWord' as const };
      return { ...state, error };
    }

    // one step back: removes the last path cell; once the path is empty,
    // reopens the keyboard for the added letter
    case 'BACKSPACE': {
      if (state.phase !== 'word')
        return state;
      if (state.track.length > 0)
        return { ...state, track: state.track.slice(0, -1), error: null };
      if (state.numChar !== null)
        return { ...state, selectedCell: state.numChar, phase: 'letter', error: null };
      return state;
    }

    case 'CANCEL_MOVE': {
      if (state.phase !== 'letter' && state.phase !== 'word')
        return state;
      // canceling a letter change (the keyboard reopened for an existing move —
      // numChar is set): back to the word, the path and the letter survive
      if (state.phase === 'letter' && state.numChar !== null)
        return { ...state, selectedCell: null, phase: 'word', error: null };
      return {
        ...state,
        board: state.boardBackup !== null ? state.boardBackup.slice() : state.board,
        boardBackup: null,
        track: [],
        numChar: null, // fix: the original did not reset numChar
        selectedCell: null,
        phase: 'idle',
        error: null,
        status: null,
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
          status: { kind: 'botSkip' },
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
        status: { kind: 'botMove', word: action.move.word },
        phase: usedWords.length >= MAX_WORDS ? 'over' : 'idle',
      };
    }
  }
}
