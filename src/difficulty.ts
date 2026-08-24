// Bot difficulty, switched from the footer and persisted in localStorage.
// It only changes which of the found moves the computer plays (see finder.ts):
// easy — a random word of at most 4 letters; medium — the longest word of at
// most 5 letters; hard — the longest word with no length limit at all. Both
// capped levels ease off by one letter (to 3 and 4) while the computer would
// overtake the player. Applies from the next bot turn, without restarting the
// game.

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

// applied when the player has no saved choice
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

const STORAGE_KEY = 'balda-difficulty';

export function loadDifficulty(): Difficulty {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && DIFFICULTIES.indexOf(stored as Difficulty) !== -1)
      return stored as Difficulty;
  } catch {
    // localStorage may be unavailable — keep the default
  }
  return DEFAULT_DIFFICULTY;
}

export function saveDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(STORAGE_KEY, d);
  } catch {
    // ignore write failures
  }
}
