// Game state model. The original's pattern of attaching and removing listeners
// (setChar ⇄ setTrack) is replaced with an explicit state machine in phase.

export type Phase =
  | 'menu'  // before the "Старт" button is pressed
  | 'idle'  // choosing an empty cell
  | 'letter' // entering a letter, the virtual keyboard is open
  | 'word'  // clicks on adjacent cells build the path
  | 'bot'   // the computer's turn
  | 'over'; // the game is over

export interface BotMove {
  word: string;
  char: string;
  index: number;
}

export interface GameState {
  phase: Phase;
  board: string[];             // 25 cells, '' = empty
  usedWords: string[];         // all words of the game, [0] = 'балда'
  playerWords: string[];       // the player's words; score = sum of lengths
  botWords: string[];          // the computer's words
  selectedCell: number | null; // the chosen empty cell (letter phase)
  numChar: number | null;      // the cell with the new letter (highlighted .add)
  track: number[];             // the path — the word being built
  boardBackup: string[] | null; // board backup for "Отмена" (the original's bakArr)
  error: string;               // validation error text (the original's #error)
  status: string;              // service messages («Компьютер думает…» etc.)
  lastBotMove: BotMove | null;
}

export type Action =
  | { type: 'START_GAME' }
  | { type: 'NEW_GAME' }
  | { type: 'CLICK_CELL'; index: number }
  | { type: 'SET_LETTER'; char: string }
  | { type: 'SUBMIT_MOVE' }
  | { type: 'CANCEL_MOVE' }
  | { type: 'BOT_MOVED'; move: BotMove | null };
