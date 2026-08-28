// The game in progress survives leaving the app: closing the tab, the phone's
// Back button (which in an installed PWA closes the app outright — there is no
// page behind it), the OS evicting the standalone app from memory, a reload.
// Everything the reducer holds is plain data, so the state is written to
// localStorage on every change and read back at startup.
//
// What is NOT restored is as important as what is. The saved snapshot keeps
// only the finished game — board, words, their tracks, language. The
// half-made move
// (selectedCell, numChar, track, boardBackup) and the transient chatter
// (error, status, lastBotMove) are dropped: a pointer drag interrupted by the
// app closing is not a state the player can meaningfully resume into, and a
// restored `board` still carrying the pending letter with no way to cancel it
// would corrupt the game. The move is rolled back to boardBackup before the
// board is stored, so an interrupted turn resumes as a clean `idle`.
//
// The phase is likewise never restored verbatim: only 'over' (the finished
// game, so the end panel comes back) and 'idle' exist in the snapshot.
// A saved 'bot' phase would be a trap — the bot turn is an effect keyed on the
// phase in App.tsx, and while it does re-fire on restore, the player's word is
// already in usedWords, so replaying the computer's answer on top of a board
// it never saw is not the game they left. 'bot' is stored as 'idle' and the
// computer simply forfeits that one answer.
import { SIZE, MAX_WORDS } from '../game/constants';
import { LANGS } from '../lang';
import type { Lang } from '../game/lang';
import type { GameState } from './types';
import { freshGame } from './gameReducer';

const STORAGE_KEY = 'balda-game';

// bumped whenever the shape below changes — an old snapshot is then ignored
// rather than half-read into a state the reducer cannot handle
const VERSION = 2;

interface Snapshot {
  v: number;
  lang: Lang;
  over: boolean;
  board: string[];
  usedWords: string[];
  playerWords: string[];
  botWords: string[];
  tracks: Record<string, number[]>; // each played word's board path (types.ts)
}

export function saveGame(state: GameState): void {
  // a game still on its starting word is not progress worth restoring, and
  // writing it would pin the random starting word of the very first launch
  if (state.usedWords.length <= 1) {
    clearGame();
    return;
  }
  // the pending move is rolled back exactly the way CANCEL_MOVE does it
  const board = state.boardBackup !== null ? state.boardBackup : state.board;
  const snapshot: Snapshot = {
    v: VERSION,
    lang: state.lang,
    over: state.phase === 'over',
    board,
    usedWords: state.usedWords,
    playerWords: state.playerWords,
    botWords: state.botWords,
    tracks: state.tracks,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota or a private-mode block — the game just will not be restorable
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// the saved game for `lang`, or null when there is none, it is unreadable, it
// belongs to the other language, or it fails the shape check below. A stored
// game that does not survive validation is dropped rather than repaired: a
// wrong board is worse than a fresh one.
export function loadGame(lang: Lang): GameState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null)
    return null;

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    clearGame();
    return null;
  }
  if (!isSnapshot(snapshot) || snapshot.v !== VERSION || snapshot.lang !== lang) {
    // a snapshot of the other language is kept, not cleared: switching the
    // language restarts the game anyway, and switching back should not have
    // to have destroyed the game that was left there
    if (isSnapshot(snapshot) && snapshot.v === VERSION)
      return null;
    clearGame();
    return null;
  }

  // the transient half of the state is rebuilt empty — see the header.
  // tracks fully replaces freshGame's own (its random starting word is not
  // the saved game's one)
  return {
    ...freshGame(snapshot.lang),
    board: snapshot.board,
    usedWords: snapshot.usedWords,
    playerWords: snapshot.playerWords,
    botWords: snapshot.botWords,
    tracks: snapshot.tracks,
    phase: snapshot.over ? 'over' : 'idle',
  };
}

// the reducer's initializer: the saved game for the language, or a new one
export function initGame(lang: Lang): GameState {
  return loadGame(lang) ?? freshGame(lang);
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null)
    return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.v === 'number' &&
    typeof s.lang === 'string' &&
    LANGS.some((l) => l.id === s.lang) &&
    typeof s.over === 'boolean' &&
    isWordList(s.usedWords) &&
    isWordList(s.playerWords) &&
    isWordList(s.botWords) &&
    isTrackMap(s.tracks) &&
    // the board is the fixed 25 cells of strings, and the words played must
    // fit the game's own limit — a snapshot outside them is corrupt
    Array.isArray(s.board) &&
    s.board.length === SIZE * SIZE &&
    s.board.every((c) => typeof c === 'string') &&
    (s.usedWords as string[]).length >= 1 &&
    (s.usedWords as string[]).length <= MAX_WORDS
  );
}

function isWordList(value: unknown): boolean {
  return Array.isArray(value) && value.every((w) => typeof w === 'string');
}

// word -> board path: every track is a non-empty list of cell indices in
// range (the shape only — which words the keys name is the game's own
// business)
function isTrackMap(value: unknown): boolean {
  if (typeof value !== 'object' || value === null)
    return false;
  return Object.values(value).every(
    (t) =>
      Array.isArray(t) &&
      t.length >= 1 &&
      t.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < SIZE * SIZE),
  );
}
