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
//   - the word is drawn with a single drag gesture only (the DRAG_* actions): the release
//     submits it, dragging back over the path unwinds it, and a drag from an unrelated
//     cell replaces the path — the fast redo after a validation error;
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
        // moves the pending letter there (the board stays visible)
        if (state.board[i] === '' && hasFilledNeighbor(state.board, i))
          return { ...state, selectedCell: i };
        return state;
      }
      return state;
    }

    // The drag-selection actions (see Board.tsx) — the only way a word is built:
    // re-entering a path cell unwinds the path to that cell, a drag from an
    // unrelated cell replaces it, and the release submits what is drawn.
    case 'DRAG_START': {
      // the pointer first left the cell where the drag began — anchor the
      // path there before the gesture continues into other cells
      if (state.phase !== 'word' || state.board[action.index] === '')
        return state;
      const i = action.index;
      const pos = state.track.indexOf(i);
      if (pos !== -1) {
        // the drag began on a path cell: rewind to it (or keep the tip as is)
        if (pos === state.track.length - 1)
          return state;
        return { ...state, track: state.track.slice(0, pos + 1), error: null };
      }
      const last = state.track.length > 0 ? state.track[state.track.length - 1] : null;
      if (last === null || areAdjacent(last, i))
        return { ...state, track: state.track.concat([i]), error: null };
      // a drag from a cell unrelated to the path starts a new word — the old
      // path gives way (handy after a validation error, which keeps the path)
      return { ...state, track: [i], error: null };
    }

    case 'DRAG_CELL': {
      // the pointer entered another cell mid-drag: extend, unwind on the way
      // back, ignore empty cells and non-adjacent jumps (diagonal corner cuts)
      if (state.phase !== 'word' || state.board[action.index] === '')
        return state;
      const i = action.index;
      const pos = state.track.indexOf(i);
      if (pos !== -1) {
        if (pos === state.track.length - 1)
          return state; // already the tip
        return { ...state, track: state.track.slice(0, pos + 1), error: null };
      }
      if (state.track.length > 0 && !areAdjacent(state.track[state.track.length - 1], i))
        return state;
      return { ...state, track: state.track.concat([i]), error: null };
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
      // On any error the track is kept, so the word can be redrawn with a new drag
      // instead of being rebuilt from scratch.
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
