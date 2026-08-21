// Проверка перенесённой логики без тестового фреймворка (см. PLAN.md):
// словарь, геометрия поля и поиск лучшего хода на эталонных позициях.
// Запуск: npm run check
import { dictionary } from '../src/game/dictionary';
import { dic } from '../src/game/dic';
import { findBestMove } from '../src/game/finder';
import { SIZE, START_ROW, START_WORD, ALPHABET, MAX_WORDS } from '../src/game/constants';
import { neighbors, areAdjacent, wordFromTrack } from '../src/state/helpers';
import { gameReducer, initialState } from '../src/state/gameReducer';

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

// --- редьюсер: машина состояний и валидация ---

// поиск пути для конкретного слова (для управления редьюсером в симуляции)
function findWordPath(board: string[], word: string, mustInclude: number): number[] | null {
  const path: number[] = [];
  const used: boolean[] = new Array(board.length).fill(false);
  function dfs(cur: number, pos: number): boolean {
    if (board[cur] !== word[pos] || used[cur]) return false;
    used[cur] = true;
    path.push(cur);
    if (pos === word.length - 1) {
      if (path.indexOf(mustInclude) !== -1) return true;
    } else {
      const nb = neighbors(cur);
      for (let k = 0; k < nb.length; k++)
        if (dfs(nb[k], pos + 1)) return true;
    }
    path.pop();
    used[cur] = false;
    return false;
  }
  for (let start = 0; start < board.length; start++)
    if (dfs(start, 0)) return path.slice();
  return null;
}

let s = gameReducer(initialState, { type: 'START_GAME' });
assert(s.phase === 'idle' && s.usedWords.length === 1 && s.board[10] === 'б', 'START_GAME: стартовое слово в средней строке');
assert(gameReducer(s, { type: 'NEW_GAME' }).usedWords.length === 1, 'NEW_GAME перезапускает партию');

// ход игрока «фалда», ответ компьютера «халда» (сконструированный ход)
s = gameReducer(s, { type: 'CLICK_CELL', index: 6 });
assert(s.phase === 'letter' && s.selectedCell === 6, 'клик по пустой клетке открывает ввод буквы');
s = gameReducer(s, { type: 'SET_LETTER', char: 'ф' });
assert(s.phase === 'word' && s.numChar === 6 && s.board[6] === 'ф', 'буква ставится и подсвечивается (numChar)');
const faldaPath = [6, 11, 12, 13, 14];
for (const c of faldaPath) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
assert(wordFromTrack(s.board, s.track) === 'фалда', 'путь собирает слово «фалда»');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.phase === 'bot' && s.playerWords.length === 1 && s.error === '', 'успешный ход переводит в фазу bot');
s = gameReducer(s, { type: 'BOT_MOVED', move: { word: 'халда', char: 'х', index: 16 } });
assert(s.phase === 'idle' && s.board[16] === 'х' && s.botWords.length === 1, 'BOT_MOVED вписывает букву и слово');

// «Слово "…" уже использовано»: новая «а» в клетке 17, путь х(16)-а(17)-л(12)-д(13)-а(14)
s = gameReducer(s, { type: 'CLICK_CELL', index: 17 });
s = gameReducer(s, { type: 'SET_LETTER', char: 'а' });
for (const c of [16, 17, 12, 13, 14]) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
assert(wordFromTrack(s.board, s.track) === 'халда', 'путь собирает слово «халда»');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error === 'Слово "халда" уже использовано' && s.track.length === 0 && s.phase === 'word',
  'повтор слова отклоняется с текстом оригинала');

// «Отмена» сбрасывает numChar (исправление оригинала)
s = gameReducer(s, { type: 'CANCEL_MOVE' });
assert(s.phase === 'idle' && s.board[17] === '' && s.numChar === null, 'отмена откатывает букву и numChar');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error === 'Добавьте букву', 'ход без буквы даёт «Добавьте букву»');

// пропуск хода компьютером (в оригинале падало): успешный ход игрока, затем бот без хода
const mv2 = findBestMove(s.board, s.usedWords);
if (mv2 === null) {
  console.log('     пропуск: на этой позиции у игрока нет хода');
} else {
  const b3 = s.board.slice();
  b3[mv2.index] = mv2.char;
  const path2 = findWordPath(b3, mv2.word, mv2.index);
  s = gameReducer(s, { type: 'CLICK_CELL', index: mv2.index });
  s = gameReducer(s, { type: 'SET_LETTER', char: mv2.char });
  if (path2 !== null)
    for (const c of path2) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
  s = gameReducer(s, { type: 'SUBMIT_MOVE' });
  assert(s.phase === 'bot', 'ход игрока принят (фаза bot)');
  s = gameReducer(s, { type: 'BOT_MOVED', move: null });
  assert(s.phase === 'idle' && s.status !== '', 'нет хода у бота — пропуск без падения');
}

// --- полная партия до конца через редьюсер (обе стороны лучшим ходом) ---

let g = gameReducer(initialState, { type: 'START_GAME' });
let guard = 0;
let simError = '';
while (g.phase !== 'over' && guard++ < 100 && !simError) {
  if (g.phase === 'idle') {
    const mv = findBestMove(g.board, g.usedWords);
    if (mv === null) { simError = 'у игрока нет хода'; break; }
    const b2 = g.board.slice();
    b2[mv.index] = mv.char;
    const path = findWordPath(b2, mv.word, mv.index);
    if (path === null) { simError = 'нет пути для слова ' + mv.word; break; }
    g = gameReducer(g, { type: 'CLICK_CELL', index: mv.index });
    g = gameReducer(g, { type: 'SET_LETTER', char: mv.char });
    for (const c of path) g = gameReducer(g, { type: 'CLICK_CELL', index: c });
    if (wordFromTrack(g.board, g.track) !== mv.word) { simError = 'путь дал не то слово'; break; }
    g = gameReducer(g, { type: 'SUBMIT_MOVE' });
    if (g.phase !== 'bot' && g.phase !== 'over') { simError = 'SUBMIT дал phase=' + g.phase; break; }
  } else if (g.phase === 'bot') {
    const mv = findBestMove(g.board, g.usedWords);
    g = gameReducer(g, { type: 'BOT_MOVED', move: mv });
    if (g.phase !== 'idle' && g.phase !== 'over') { simError = 'BOT_MOVED дал phase=' + g.phase; break; }
  } else {
    simError = 'неожиданная фаза ' + g.phase;
  }
}
assert(simError === '', 'полная партия без ошибок: ' + (simError || 'ок'));
assert(g.phase === 'over', 'партия завершается фазой over (phase=' + g.phase + ')');
assert(g.usedWords.length === MAX_WORDS, 'в конце ровно ' + MAX_WORDS + ' слов, факт: ' + g.usedWords.length);
assert(g.playerWords.length === 10 && g.botWords.length === 10, 'по 10 слов у игрока и компьютера');
assert(g.usedWords.indexOf('балда') === 0, 'стартовое слово — первое в usedWords');
let unique = true;
for (let i = 0; i < g.usedWords.length; i++)
  if (g.usedWords.indexOf(g.usedWords[i]) !== i) unique = false;
assert(unique, 'все слова партии уникальны');
let allInDic = true;
for (let i = 1; i < g.usedWords.length; i++)
  if (!dic.findWord(g.usedWords[i])) allInDic = false;
assert(allInDic, 'все слова партии есть в словаре');
function sumLen(words: string[]): number {
  let n = 0;
  for (const w of words) n += w.length;
  return n;
}
console.log('     итог партии: игрок ' + sumLen(g.playerWords) + ' : ' + sumLen(g.botWords) + ' компьютер');

if (failures > 0) {
  console.error('\nПровалено проверок: ' + failures);
  throw new Error('check failed');
}
console.log('\nВсе проверки пройдены');
