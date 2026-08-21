// Алфавит игры: 32 буквы, без «ё» (как в оригинале)
export const ALPHABET = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';

// Поле SIZE × SIZE клеток
export const SIZE = 5;

// Стартовое слово в средней строке
export const START_WORD = 'балда';

// Партия заканчивается, когда составлено столько слов (включая стартовое)
export const MAX_WORDS = 21;

// Индекс первой клетки средней строки (для поля 5×5 — клетка 10)
export const START_ROW = Math.floor(SIZE / 2) * SIZE;
