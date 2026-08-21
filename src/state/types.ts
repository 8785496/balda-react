// Game state model. The original's pattern of attaching and removing listeners
// (setChar ⇄ setTrack) is replaced with an explicit state machine in phase.
import type { Lang } from '../game/lang';

export type Phase =
  | 'idle'  // choosing an empty cell
  | 'letter' // entering a letter (the keyboard floats at the selected cell)
  | 'word'  // clicks or drags over adjacent cells build the path
  | 'bot'   // the computer's turn
  | 'over'; // the game is over

export interface BotMove {
  word: string;
  char: string;
  index: number;
  track: number[];   // the word's path on the board
}

// validation error as structured data — the view renders it as text in the
// current language (texts.error in i18n.ts; the Russian texts are the
// original's, see the header of gameReducer.ts)
export interface GameError {
  code: 'noAddedLetter' | 'wordUsed' | 'wordNotFound' | 'addLetter' | 'chooseWord';
  word?: string; // the rejected word, for wordUsed / wordNotFound
}

// service status of the computer's turn, localized on render (texts.status)
export type Status =
  | { kind: 'botMove'; word: string } // the computer played a word
  | { kind: 'botSkip' };              // no move — the turn is skipped

export interface GameState {
  lang: Lang;                  // the game's language: alphabet, dictionary, starting word
  phase: Phase;
  board: string[];             // 25 cells, '' = empty
  usedWords: string[];         // all words of the game, [0] = the starting word
  playerWords: string[];       // the player's words; score = sum of lengths
  botWords: string[];          // the computer's words
  selectedCell: number | null; // the chosen empty cell (letter phase)
  numChar: number | null;      // the cell with the new letter (highlighted .add)
  track: number[];             // the path — the word being built
  boardBackup: string[] | null; // board backup for "Отмена" (the original's bakArr)
  error: GameError | null;     // validation error (the original's #error)
  status: Status | null;       // service messages (the computer's move etc.)
  lastBotMove: BotMove | null; // shown in the status line and highlighted on the board
}

export type Action =
  | { type: 'NEW_GAME'; lang?: Lang } // restarts, optionally switching the game language
  | { type: 'CLICK_CELL'; index: number }
  | { type: 'DRAG_START'; index: number } // a drag left its start cell — anchor the path there
  | { type: 'DRAG_CELL'; index: number } // the pointer entered a cell mid-drag
  | { type: 'SET_LETTER'; char: string }
  | { type: 'BACKSPACE' } // one step back: drop the last path cell / change the letter
  | { type: 'SUBMIT_MOVE' }
  | { type: 'CANCEL_MOVE' }
  | { type: 'BOT_MOVED'; move: BotMove | null };
