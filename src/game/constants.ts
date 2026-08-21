// Game alphabet: 32 letters, no "ё" (as in the original)
export const ALPHABET = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';

// Board of SIZE × SIZE cells
export const SIZE = 5;

// Starting word placed in the middle row
export const START_WORD = 'балда';

// The game ends when this many words have been played (including the starting one)
export const MAX_WORDS = 21;

// Index of the first cell of the middle row (cell 10 on a 5×5 board)
export const START_ROW = Math.floor(SIZE / 2) * SIZE;
