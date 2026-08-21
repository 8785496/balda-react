// Проверка перенесённой логики без тестового фреймворка (см. PLAN.md):
// словарь, геометрия поля и поиск лучшего хода на эталонных позициях.
// Запуск: npm run check
import { dictionary } from '../src/game/dictionary';
import { dic } from '../src/game/dic';
import { findBestMove } from '../src/game/finder';
import { SIZE, START_ROW, START_WORD, ALPHABET } from '../src/game/constants';
import { neighbors, areAdjacent, wordFromTrack } from '../src/state/helpers';

let failures = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log('ok  - ' + msg);
  } else {
    failures++;
    console.error('FAIL- ' + msg);
  }
}

// --- словарь и хэши ---

assert(dictionary.length > 15000, 'словарь загружен: ' + dictionary.length + ' слов');
assert(ALPHABET.length === 32 && ALPHABET.indexOf('ё') === -1, 'алфавит: 32 буквы без «ё»');
assert(dic.findWord('балда') === true, 'findWord("балда") === true');
assert(dic.findWord('абажур') === true, 'findWord("абажур") === true');
assert(dic.findWord('ясновидящий') === false, 'слово длиннее 10 букв не ищется (как в оригинале)');
assert(dic.findWord('щщщ') === false, 'findWord("щщщ") === false');
assert(dic.hasPrefix('бал') === true, 'hasPrefix("бал") === true');
assert(dic.hasPrefix('щщ') === false, 'hasPrefix("щщ") === false');

// --- геометрия поля ---

assert(neighbors(5).indexOf(0) !== -1, 'клетка 5 видит верхнего соседа 0 (исправленный баг i > 5)');
assert(neighbors(0).indexOf(20) === -1 && neighbors(0).indexOf(5) !== -1, 'соседи клетки 0: низ есть, верха нет');
assert(areAdjacent(7, 8) && areAdjacent(8, 7), 'смежность по горизонтали');
assert(areAdjacent(7, 12), 'смежность по вертикали');
assert(!areAdjacent(7, 11), 'диагональ не смежна');
assert(!areAdjacent(0, 24), 'противоположные углы не смежны');
assert(wordFromTrack(['а', 'б', 'в'], [2, 0, 1]) === 'ваб', 'wordFromTrack собирает слово из пути');

// --- стартовая позиция ---

const board: string[] = new Array(SIZE * SIZE).fill('');
for (let i = 0; i < START_WORD.length; i++)
  board[START_ROW + i] = START_WORD[i];

const started = Date.now();
const move = findBestMove(board, [START_WORD]);
const elapsed = (Date.now() - started) / 1000;
assert(move !== null, 'на стартовой позиции найден ход');
if (move !== null) {
  console.log('     ход на старте: ' + move.word + ' (буква «' + move.char + '» в клетке ' + move.index + '), время ' + elapsed + ' с');
  assert(dic.findWord(move.word) === true, 'слово бота есть в словаре');
  assert(move.word.indexOf(move.char) !== -1, 'слово содержит добавленную букву');
  assert(move.word !== START_WORD, 'слово не совпадает со стартовым');
  assert(move.word.length >= 4, 'на старте находится слово не короче 4 букв');
}

// --- позиция без хода: заполненное поле ---

const full: string[] = new Array(SIZE * SIZE).fill('а');
assert(findBestMove(full, []) === null, 'на заполненном поле хода нет (null вместо падения)');

// --- короткая симуляция партии: обе стороны ходят поиском лучшего хода ---

const simBoard: string[] = new Array(SIZE * SIZE).fill('');
for (let i = 0; i < START_WORD.length; i++)
  simBoard[START_ROW + i] = START_WORD[i];
const simUsed = [START_WORD];
let simOk = true;
for (let round = 0; round < 3 && simOk; round++) {
  for (let side = 0; side < 2 && simOk; side++) {
    const m = findBestMove(simBoard, simUsed);
    if (m === null) {
      console.log('     симуляция: на ходу ' + (simUsed.length + 1) + ' хода нет — пропуск');
      break;
    }
    if (simUsed.indexOf(m.word) !== -1 || !dic.findWord(m.word)) {
      simOk = false;
      break;
    }
    simBoard[m.index] = m.char;
    simUsed.push(m.word);
  }
}
assert(simOk, 'симуляция 3 раундов без некорректных слов');
console.log('     после симуляции: ' + (simUsed.length - 1) + ' слов, поле: ' + simBoard.join('|'));

if (failures > 0) {
  console.error('\nПровалено проверок: ' + failures);
  throw new Error('check failed');
}
console.log('\nВсе проверки пройдены');
