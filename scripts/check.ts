// Checks the ported logic without a test framework (see PLAN.md):
// the dictionary, board geometry, and the best-move search on reference
// positions. Run: npm run check
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

// --- dictionary and hashes ---

assert(dictionary.length > 15000, 'dictionary loaded: ' + dictionary.length + ' words');
assert(ALPHABET.length === 32 && ALPHABET.indexOf('ё') === -1, 'alphabet: 32 letters without "ё"');
assert(dic.findWord('балда') === true, 'findWord("балда") === true');
assert(dic.findWord('абажур') === true, 'findWord("абажур") === true');
assert(dic.findWord('ясновидящий') === false, 'a word longer than 10 letters is not looked up (as in the original)');
assert(dic.findWord('щщщ') === false, 'findWord("щщщ") === false');
assert(dic.hasPrefix('бал') === true, 'hasPrefix("бал") === true');
assert(dic.hasPrefix('щщ') === false, 'hasPrefix("щщ") === false');

// --- board geometry ---

assert(neighbors(5).indexOf(0) !== -1, 'cell 5 sees its top neighbor 0 (the fixed i > 5 bug)');
assert(neighbors(0).indexOf(20) === -1 && neighbors(0).indexOf(5) !== -1, 'neighbors of cell 0: bottom yes, top no');
assert(areAdjacent(7, 8) && areAdjacent(8, 7), 'horizontal adjacency');
assert(areAdjacent(7, 12), 'vertical adjacency');
assert(!areAdjacent(7, 11), 'a diagonal is not adjacent');
assert(!areAdjacent(0, 24), 'opposite corners are not adjacent');
assert(wordFromTrack(['а', 'б', 'в'], [2, 0, 1]) === 'ваб', 'wordFromTrack builds a word from a path');

// --- starting position ---

const board: string[] = new Array(SIZE * SIZE).fill('');
for (let i = 0; i < START_WORD.length; i++)
  board[START_ROW + i] = START_WORD[i];

const started = Date.now();
const move = findBestMove(board, [START_WORD]);
const elapsed = (Date.now() - started) / 1000;
assert(move !== null, 'a move is found on the starting position');
if (move !== null) {
  console.log('     starting move: ' + move.word + ' (letter "' + move.char + '" at cell ' + move.index + '), time ' + elapsed + ' s');
  assert(dic.findWord(move.word) === true, "the bot's word exists in the dictionary");
  assert(move.word.indexOf(move.char) !== -1, 'the word contains the added letter');
  assert(move.word !== START_WORD, 'the word differs from the starting one');
  assert(move.word.length >= 4, 'a word of at least 4 letters is found on the starting position');
}

// --- a position with no moves: a full board ---

const full: string[] = new Array(SIZE * SIZE).fill('а');
assert(findBestMove(full, []) === null, 'no move on a full board (null instead of a crash)');

// --- a short game simulation: both sides play the best move found ---

const simBoard: string[] = new Array(SIZE * SIZE).fill('');
for (let i = 0; i < START_WORD.length; i++)
  simBoard[START_ROW + i] = START_WORD[i];
const simUsed = [START_WORD];
let simOk = true;
for (let round = 0; round < 3 && simOk; round++) {
  for (let side = 0; side < 2 && simOk; side++) {
    const m = findBestMove(simBoard, simUsed);
    if (m === null) {
      console.log('     simulation: no move at turn ' + (simUsed.length + 1) + ' — skip');
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
assert(simOk, 'simulation of 3 rounds without invalid words');
console.log('     after the simulation: ' + (simUsed.length - 1) + ' words, board: ' + simBoard.join('|'));

// --- reducer: the state machine and validation ---

// find a path for a specific word (to drive the reducer in the simulation)
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

let s = initialState;
assert(s.phase === 'idle' && s.usedWords.length === 1 && s.board[10] === 'б',
  'the game starts immediately: the starting word is in the middle row');
assert(gameReducer(s, { type: 'NEW_GAME' }).usedWords.length === 1, 'NEW_GAME restarts the game');

// the player plays "фалда", the computer replies "халда" (a constructed move)
s = gameReducer(s, { type: 'CLICK_CELL', index: 6 });
assert(s.phase === 'letter' && s.selectedCell === 6, 'a click on an empty cell opens letter input');
s = gameReducer(s, { type: 'SET_LETTER', char: 'ф' });
assert(s.phase === 'word' && s.numChar === 6 && s.board[6] === 'ф', 'the letter is placed and highlighted (numChar)');
const faldaPath = [6, 11, 12, 13, 14];
for (const c of faldaPath) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
assert(wordFromTrack(s.board, s.track) === 'фалда', 'the path builds the word "фалда"');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.phase === 'bot' && s.playerWords.length === 1 && s.error === '', 'a successful move switches to the bot phase');
s = gameReducer(s, { type: 'BOT_MOVED', move: { word: 'халда', char: 'х', index: 16 } });
assert(s.phase === 'idle' && s.board[16] === 'х' && s.botWords.length === 1, 'BOT_MOVED writes the letter and the word');

// "word already used": a new "а" at cell 17, path х(16)-а(17)-л(12)-д(13)-а(14)
s = gameReducer(s, { type: 'CLICK_CELL', index: 17 });
s = gameReducer(s, { type: 'SET_LETTER', char: 'а' });
for (const c of [16, 17, 12, 13, 14]) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
assert(wordFromTrack(s.board, s.track) === 'халда', 'the path builds the word "халда"');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error === 'Слово "халда" уже использовано' && s.phase === 'word',
  'a repeated word is rejected with the original text');
assert(s.track.length === 5, 'a validation error keeps the path for editing');

// a click on the last path cell and BACKSPACE remove it from the path
s = gameReducer(s, { type: 'CLICK_CELL', index: 14 });
assert(s.track.length === 4 && wordFromTrack(s.board, s.track) === 'халд',
  'a click on the last cell removes it from the path');
s = gameReducer(s, { type: 'BACKSPACE' });
assert(s.track.length === 3 && wordFromTrack(s.board, s.track) === 'хал',
  'BACKSPACE removes the last path cell');
s = gameReducer(s, { type: 'CLICK_CELL', index: 13 });
s = gameReducer(s, { type: 'CLICK_CELL', index: 14 });
assert(wordFromTrack(s.board, s.track) === 'халда', 'the path is rebuilt back to "халда"');

// changing the letter without canceling the move: a click on the added letter
// mid-path reopens the keyboard, the path stays; a new letter replaces the old one
s = gameReducer(s, { type: 'CLICK_CELL', index: 17 });
assert(s.phase === 'letter' && s.selectedCell === 17 && s.numChar === 17 && s.track.length === 5,
  'a click on the added letter mid-path reopens the keyboard, the path is kept');
s = gameReducer(s, { type: 'SET_LETTER', char: 'у' });
assert(s.phase === 'word' && s.board[17] === 'у' && wordFromTrack(s.board, s.track) === 'хулда',
  'a new letter replaces the old one in the same path');
s = gameReducer(s, { type: 'CLICK_CELL', index: 17 });
s = gameReducer(s, { type: 'CANCEL_MOVE' });
assert(s.phase === 'word' && s.board[17] === 'у' && s.track.length === 5,
  'canceling the letter change returns to the word, the path is kept');

// BACKSPACE with an empty path reopens the keyboard over the added letter
for (let k = 0; k < 5; k++) s = gameReducer(s, { type: 'BACKSPACE' });
assert(s.phase === 'word' && s.track.length === 0, 'BACKSPACE empties the path');
s = gameReducer(s, { type: 'BACKSPACE' });
assert(s.phase === 'letter' && s.selectedCell === 17 && s.numChar === 17,
  'BACKSPACE with an empty path reopens the keyboard over the added letter');
s = gameReducer(s, { type: 'SET_LETTER', char: 'а' });
assert(s.phase === 'word' && s.board[17] === 'а' && s.track.length === 0,
  'the letter is changed, the move continues');

// "Отмена" resets numChar (a fix over the original)
s = gameReducer(s, { type: 'CANCEL_MOVE' });
assert(s.phase === 'idle' && s.board[17] === '' && s.numChar === null, 'cancel rolls back the letter and numChar');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error === 'Добавьте букву', 'a move without a letter yields "Добавьте букву"');

// the bot skipping its turn (the original crashed here): a successful player move, then a bot with no move
const mv2 = findBestMove(s.board, s.usedWords);
if (mv2 === null) {
  console.log('     skip: the player has no move at this position');
} else {
  const b3 = s.board.slice();
  b3[mv2.index] = mv2.char;
  const path2 = findWordPath(b3, mv2.word, mv2.index);
  s = gameReducer(s, { type: 'CLICK_CELL', index: mv2.index });
  s = gameReducer(s, { type: 'SET_LETTER', char: mv2.char });
  if (path2 !== null)
    for (const c of path2) s = gameReducer(s, { type: 'CLICK_CELL', index: c });
  s = gameReducer(s, { type: 'SUBMIT_MOVE' });
  assert(s.phase === 'bot', "the player's move is accepted (bot phase)");
  s = gameReducer(s, { type: 'BOT_MOVED', move: null });
  assert(s.phase === 'idle' && s.status !== '', 'no move for the bot — the turn is skipped without a crash');
}

// --- a full game to the end through the reducer (both sides play the best move) ---

let g = initialState;
let guard = 0;
let simError = '';
while (g.phase !== 'over' && guard++ < 100 && !simError) {
  if (g.phase === 'idle') {
    const mv = findBestMove(g.board, g.usedWords);
    if (mv === null) { simError = 'the player has no move'; break; }
    const b2 = g.board.slice();
    b2[mv.index] = mv.char;
    const path = findWordPath(b2, mv.word, mv.index);
    if (path === null) { simError = 'no path for the word ' + mv.word; break; }
    g = gameReducer(g, { type: 'CLICK_CELL', index: mv.index });
    g = gameReducer(g, { type: 'SET_LETTER', char: mv.char });
    for (const c of path) g = gameReducer(g, { type: 'CLICK_CELL', index: c });
    if (wordFromTrack(g.board, g.track) !== mv.word) { simError = 'the path produced a different word'; break; }
    g = gameReducer(g, { type: 'SUBMIT_MOVE' });
    if (g.phase !== 'bot' && g.phase !== 'over') { simError = 'SUBMIT gave phase=' + g.phase; break; }
  } else if (g.phase === 'bot') {
    const mv = findBestMove(g.board, g.usedWords);
    g = gameReducer(g, { type: 'BOT_MOVED', move: mv });
    if (g.phase !== 'idle' && g.phase !== 'over') { simError = 'BOT_MOVED gave phase=' + g.phase; break; }
  } else {
    simError = 'unexpected phase ' + g.phase;
  }
}
assert(simError === '', 'full game without errors: ' + (simError || 'ok'));
assert(g.phase === 'over', 'the game ends with phase over (phase=' + g.phase + ')');
assert(g.usedWords.length === MAX_WORDS, 'exactly ' + MAX_WORDS + ' words at the end, actual: ' + g.usedWords.length);
assert(g.playerWords.length === 10 && g.botWords.length === 10, '10 words each for the player and the computer');
assert(g.usedWords.indexOf('балда') === 0, 'the starting word is the first in usedWords');
let unique = true;
for (let i = 0; i < g.usedWords.length; i++)
  if (g.usedWords.indexOf(g.usedWords[i]) !== i) unique = false;
assert(unique, 'all words of the game are unique');
let allInDic = true;
for (let i = 1; i < g.usedWords.length; i++)
  if (!dic.findWord(g.usedWords[i])) allInDic = false;
assert(allInDic, 'all words of the game exist in the dictionary');
function sumLen(words: string[]): number {
  let n = 0;
  for (const w of words) n += w.length;
  return n;
}
console.log('     final score: player ' + sumLen(g.playerWords) + ' : ' + sumLen(g.botWords) + ' computer');

if (failures > 0) {
  console.error('\nFailed checks: ' + failures);
  throw new Error('check failed');
}
console.log('\nAll checks passed');
