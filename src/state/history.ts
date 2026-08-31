// The archive of finished games. The saved game of state/persist.ts holds the
// one game in progress — this module keeps the games that are over: the
// moment a game ends (21 words), it is copied here, and the footer clock
// button lists the archive, each entry loadable back onto the board (see
// HistoryModal.tsx and the LOAD_GAME action). A game abandoned by «Заново»
// or a language switch is not a finished game and never enters the history.
//
// The entry holds the same fields as persist's snapshot (board, the three
// word lists, tracks — everything a restored state needs) plus the finish
// timestamp. The slot is versioned and shape-checked on read like the saved
// game is; a corrupt entry is dropped on read rather than repaired, and the
// next archive or removal rewrites the slot without it.
import { SIZE, MAX_WORDS } from '../game/constants';
import { LANGS } from '../lang';
import type { Lang } from '../game/lang';
import type { GameState } from './types';
import { freshGame } from './gameReducer';
import { isWordList, isTrackMap } from './persist';

const STORAGE_KEY = 'balda-history';

// bumped whenever the shape below changes — an old archive is then ignored
// rather than half-read
const VERSION = 1;

// how many finished games are kept; the oldest beyond the cap is dropped
// when a new one lands
export const MAX_GAMES = 100;

export interface HistoryEntry {
  at: number; // Date.now() when the game ended — the row's key and order
  lang: Lang;
  board: string[];
  usedWords: string[];
  playerWords: string[];
  botWords: string[];
  tracks: Record<string, number[]>;
}

interface HistorySnapshot {
  v: number;
  games: HistoryEntry[];
}

// the game's identity for the duplicate check: the language plus every word
// played, the starting word included. The starting word is random, so two
// genuinely different games colliding on all 21 words is practically
// impossible — but loading a game back from the history re-fires the archiving
// effect's phase transition, and an exact replay of it must not archive twice
function fingerprint(lang: Lang, usedWords: string[]): string {
  return lang + '|' + usedWords.join(',');
}

// archives a finished game; anything still in play is left alone
export function addGame(state: GameState): void {
  if (state.phase !== 'over')
    return;
  const games = listGames();
  if (
    games.some((g) => fingerprint(g.lang, g.usedWords) === fingerprint(state.lang, state.usedWords))
  )
    return;
  const entry: HistoryEntry = {
    at: Date.now(),
    lang: state.lang,
    board: state.board,
    usedWords: state.usedWords,
    playerWords: state.playerWords,
    botWords: state.botWords,
    tracks: state.tracks,
  };
  const snapshot: HistorySnapshot = {
    v: VERSION,
    games: [entry].concat(games).slice(0, MAX_GAMES),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota or a private-mode block — the game just will not be remembered
  }
}

// removes one archived game by its finish timestamp (the entry's identity —
// the row's key and order). A timestamp matching nothing leaves the slot
// alone; removing the last game clears the slot
export function removeGame(at: number): void {
  const games = listGames();
  const kept = games.filter((g) => g.at !== at);
  if (kept.length === games.length)
    return;
  if (kept.length === 0) {
    clearHistory();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, games: kept }));
  } catch {
    // quota or a private-mode block — the game just will not be removed now
  }
}

// the archive, newest first; anything unreadable comes back as an empty list
export function listGames(): HistoryEntry[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null)
    return [];

  let snapshot: unknown;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    clearHistory();
    return [];
  }
  if (
    typeof snapshot !== 'object' ||
    snapshot === null ||
    (snapshot as Record<string, unknown>).v !== VERSION ||
    !Array.isArray((snapshot as Record<string, unknown>).games)
  ) {
    clearHistory();
    return [];
  }
  return ((snapshot as Record<string, unknown>).games as unknown[])
    .filter(isEntry)
    .sort((a, b) => b.at - a.at);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// the entry back into a live state: the restore pattern of persist's
// loadGame — a fresh game's transients with the entry's settled fields, the
// phase 'over' so the end panel comes back with the result
export function entryToState(entry: HistoryEntry): GameState {
  return {
    ...freshGame(entry.lang),
    board: entry.board,
    usedWords: entry.usedWords,
    playerWords: entry.playerWords,
    botWords: entry.botWords,
    tracks: entry.tracks,
    phase: 'over',
  };
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null)
    return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.at === 'number' &&
    Number.isFinite(g.at) &&
    typeof g.lang === 'string' &&
    LANGS.some((l) => l.id === g.lang) &&
    isWordList(g.usedWords) &&
    isWordList(g.playerWords) &&
    isWordList(g.botWords) &&
    isTrackMap(g.tracks) &&
    Array.isArray(g.board) &&
    g.board.length === SIZE * SIZE &&
    g.board.every((c) => typeof c === 'string') &&
    (g.usedWords as string[]).length >= 1 &&
    (g.usedWords as string[]).length <= MAX_WORDS
  );
}
