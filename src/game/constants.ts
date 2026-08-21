// Language-independent game constants. The per-language ones — the alphabet
// and the starting word — live in lang.ts, switched by the footer control.
// Board of SIZE × SIZE cells
export const SIZE = 5;

// The game ends when this many words have been played (including the starting one)
export const MAX_WORDS = 21;

// Index of the first cell of the middle row (cell 10 on a 5×5 board)
export const START_ROW = Math.floor(SIZE / 2) * SIZE;
