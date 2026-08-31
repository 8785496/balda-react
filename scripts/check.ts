// Checks the ported logic without a test framework (see AGENTS.md):
// the dictionaries, board geometry, the move search on reference positions
// (both languages, all difficulties), the reducer state machine, the
// saved-game round trip and the game history.
// Run: npm run check
import { dictionary } from '../src/game/dictionary';
import { dictionary as dictionaryEn } from '../src/game/dictionary-en';
import { findBestMove } from '../src/game/finder';
import { alphabetFor, dicFor, startWordFor } from '../src/game/lang';
import { SIZE, START_ROW, MAX_WORDS } from '../src/game/constants';
import { neighbors, areAdjacent, wordFromTrack } from '../src/state/helpers';
import { gameReducer, freshGame, initialState } from '../src/state/gameReducer';
import { saveGame, loadGame, clearGame, initGame } from '../src/state/persist';
import { addGame, listGames, removeGame, clearHistory, entryToState, MAX_GAMES } from '../src/state/history';

const dic = dicFor('ru');
const ALPHABET = alphabetFor('ru');
// the starting word is random (see below); the reference positions here are
// checked against a fixed word, as they were before randomization
const START_WORD = 'балда';

let failures = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log('ok  - ' + msg);
  } else {
    failures++;
    console.error('FAIL- ' + msg);
  }
}

// --- dictionary and prefix tree ---

assert(dictionary.length > 15000, 'dictionary loaded: ' + dictionary.length + ' words');
assert(ALPHABET.length === 32 && ALPHABET.indexOf('ё') === -1, 'alphabet: 32 letters without "ё"');
assert(dic.findWord('балда') === true, 'findWord("балда") === true');
assert(dic.findWord('абажур') === true, 'findWord("абажур") === true');
assert(dic.findWord('аббревиатура') === true, 'a 12-letter noun is in the tree (the original\'s 10-letter cap is dropped)');
assert(Math.max(...dictionary.map((w) => w.length)) > 10, 'the russian dictionary holds words longer than 10 letters');
assert(dic.findWord('щщщ') === false, 'findWord("щщщ") === false');
assert(dic.hasPrefix('бал') === true, 'hasPrefix("бал") === true');
assert(dic.hasPrefix('щщ') === false, 'hasPrefix("щщ") === false');

// --- the random starting word ---

const rndStart = startWordFor('ru');
assert(rndStart.length === SIZE && dic.findWord(rndStart) === true,
  'the russian starting word is a random 5-letter dictionary word (got "' + rndStart + '")');

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
  const botBoard = board.slice();
  botBoard[move.index] = move.char;
  assert(wordFromTrack(botBoard, move.track) === move.word, "the bot's track spells its word on the board");
  assert(move.track.indexOf(move.index) !== -1, "the bot's track contains the added letter cell");
}

// --- difficulty: which of the found moves the bot plays ---
// easy — 4-letter words, medium — the longest word of at most 5 letters,
// hard — the longest, uncapped. easy picks randomly among the words of exactly
// its length — the nearest shorter length when the board offers none — so each
// difficulty runs several times: every easy pick must be exactly the level's
// length (both fallbacks — the nearest shorter length and, when nothing fits,
// the shortest word — are deterministic and give one and the same length).
// The caps also ease off by one letter with the scores (easy 4 -> 3, medium
// 5 -> 4) — checked below. Hard has no length limit and no easing.

const RUNS = 15;
const maxLenByDiff: Record<string, number> = {};
for (const d of ['easy', 'medium', 'hard'] as const) {
  const cap = d === 'easy' ? 4 : d === 'medium' ? 5 : Infinity;
  const lengths: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const m = findBestMove(board, [START_WORD], 'ru', d);
    if (m === null)
      break;
    lengths.push(m.word.length);
    if (run === 0) {
      const diffBoard = board.slice();
      diffBoard[m.index] = m.char;
      assert(dic.findWord(m.word) === true, 'difficulty ' + d + ': the word exists in the dictionary');
      assert(wordFromTrack(diffBoard, m.track) === m.word, 'difficulty ' + d + ': the track spells the word');
      assert(m.track.indexOf(m.index) !== -1, 'difficulty ' + d + ': the track contains the added letter cell');
    }
  }
  assert(lengths.length === RUNS, 'difficulty ' + d + ': a move is found on the starting position');
  if (lengths.length > 0) {
    maxLenByDiff[d] = Math.max(...lengths);
    assert(lengths.every((l) => l <= cap),
      'difficulty ' + d + ': word lengths ' + lengths.join('/') + ' are within the level cap of ' +
      (cap === Infinity ? 'the longest word' : cap + ' letters'));
    if (d === 'easy') {
      const exactLen = lengths.every((l) => l === cap);
      const oneFallback = lengths.every((l) => l === lengths[0]);
      assert(exactLen || oneFallback,
        'difficulty easy: word lengths ' + lengths.join('/') + ' are exactly the level length of ' +
        cap + ' letters');
    }
  }
}

// easy/medium with a cap-length word about to put the computer's score above
// the player's: the cap eases off by one letter (easy 4 -> 3, medium 5 -> 4)
for (const d of ['easy', 'medium'] as const) {
  const base = d === 'easy' ? 4 : 5;
  const easeLens: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    // bot + base > player with a one-letter gap left, so the cap must drop
    const m = findBestMove(board, [START_WORD], 'ru', d, { player: base, bot: 1 });
    if (m === null)
      break;
    easeLens.push(m.word.length);
  }
  assert(easeLens.length === RUNS,
    'difficulty ' + d + ' with the eased cap: a move is found on the starting position');
  assert(easeLens.every((l) => l <= base - 1) || easeLens.every((l) => l === easeLens[0]),
    'difficulty ' + d + ' with the eased cap: word lengths ' + easeLens.join('/') +
    ' are within the eased cap of ' + (base - 1) + ' letters');
}

// hard with the player losing: the length limit does not apply — the longest
// word is played all the same
for (let run = 0; run < RUNS; run++) {
  const m = findBestMove(board, [START_WORD], 'ru', 'hard', { player: 0, bot: 5 });
  assert(m !== null && m.word.length === maxLenByDiff.hard,
    'hard with the player losing: the longest word (' + maxLenByDiff.hard + ' letters) is played regardless');
}

if (maxLenByDiff.easy !== undefined && maxLenByDiff.medium !== undefined && maxLenByDiff.hard !== undefined) {
  console.log('     longest word by difficulty: easy ' + maxLenByDiff.easy +
    ', medium ' + maxLenByDiff.medium + ', hard ' + maxLenByDiff.hard);
  assert(maxLenByDiff.easy <= maxLenByDiff.medium && maxLenByDiff.medium <= maxLenByDiff.hard,
    'the easy move is not longer than medium, medium not longer than hard');
}

// --- english language ---

const dicEn = dicFor('en');
// fixed reference word — the real starting word is random (checked below)
const startEn = 'crane';
const rndStartEn = startWordFor('en');
assert(rndStartEn.length === SIZE && dicEn.findWord(rndStartEn) === true,
  'the english starting word is a random 5-letter dictionary word (got "' + rndStartEn + '")');
assert(dictionaryEn.length > 10000, 'english dictionary loaded: ' + dictionaryEn.length + ' words');
assert(alphabetFor('en').length === 26, 'english alphabet: 26 letters');
assert(dicEn.findWord(startEn) === true, 'the english starting word "' + startEn + '" is in the dictionary');
assert(dicEn.findWord('zzzq') === false, 'findWord("zzzq") === false (en)');
assert(dicEn.findWord('communication') === true, 'en: a 13-letter noun is in the tree (the 10-letter cap is dropped)');
assert(dicEn.hasPrefix('cr') === true && dicEn.hasPrefix('zz') === false, 'hasPrefix works for english');

const enBoard: string[] = new Array(SIZE * SIZE).fill('');
for (let i = 0; i < startEn.length; i++)
  enBoard[START_ROW + i] = startEn[i];
const enStarted = Date.now();
const enMove = findBestMove(enBoard, [startEn], 'en');
assert(enMove !== null, 'en: a move is found on the starting position');
if (enMove !== null) {
  console.log('     en starting move: ' + enMove.word + ' (letter "' + enMove.char + '" at cell ' +
    enMove.index + '), time ' + ((Date.now() - enStarted) / 1000) + ' s');
  assert(dicEn.findWord(enMove.word) === true, "the bot's english word exists in the dictionary");
  assert(enMove.word.indexOf(enMove.char) !== -1, 'en: the word contains the added letter');
  const enBot = enBoard.slice();
  enBot[enMove.index] = enMove.char;
  assert(wordFromTrack(enBot, enMove.track) === enMove.word, "the bot's track spells its word on the board (en)");
}

// the reducer restarts into the other language and stays in it (the starting
// word is random, so assert on its length, dictionary membership and placement)
const gEn = gameReducer(initialState, { type: 'NEW_GAME', lang: 'en' });
assert(gEn.usedWords[0].length === SIZE && dicEn.findWord(gEn.usedWords[0]) === true &&
  gEn.board.slice(START_ROW, START_ROW + SIZE).join('') === gEn.usedWords[0],
  'NEW_GAME with lang lays out a random english starting word');
assert(dicEn.findWord(gameReducer(gEn, { type: 'NEW_GAME' }).usedWords[0]) === true,
  'a plain NEW_GAME keeps the current language');

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

// the medium cap shows only once words longer than 5 letters exist: keep
// playing the best move until one shows up, then check the capped picks —
// medium stays at 5 letters whatever the scores and drops to 4 when its word
// would overtake a leading player, while hard never caps at all.
const mercyBoard = simBoard.slice();
const mercyUsed = simUsed.slice();
let uncapped = findBestMove(mercyBoard, mercyUsed);
while (uncapped !== null && uncapped.word.length <= 5 && mercyUsed.length < MAX_WORDS) {
  mercyBoard[uncapped.index] = uncapped.char;
  mercyUsed.push(uncapped.word);
  uncapped = findBestMove(mercyBoard, mercyUsed);
}
if (uncapped !== null && uncapped.word.length > 5) {
  // playing the longest word would put the computer ahead of a player who is
  // ahead — capped to 5 letters
  // with the scores out of the picture medium still stops at 5 letters
  const plain = findBestMove(mercyBoard, mercyUsed, 'ru', 'medium');
  assert(plain !== null && plain.word.length <= 5,
    'medium: the longest move of ' + uncapped.word.length + ' letters is capped to 5 — got ' +
    (plain === null ? 'none' : plain.word.length));
  // a 5-letter word would put the computer above a leading player — eased to 4
  const overtake = findBestMove(mercyBoard, mercyUsed, 'ru', 'medium', { player: 5, bot: 1 });
  assert(overtake !== null && overtake.word.length <= 4,
    'medium: a 5-letter move would overtake a leading player — eased to ' +
    (overtake === null ? 'none' : overtake.word.length) + ' letters');
  // the player is already losing — the eased cap applies too
  const mercy = findBestMove(mercyBoard, mercyUsed, 'ru', 'medium', { player: 0, bot: 5 });
  assert(mercy !== null && mercy.word.length <= 4,
    'medium with the player losing: the move is eased to ' +
    (mercy === null ? 'none' : mercy.word.length) + ' letters');
  // hard: the same positions, no cap — the longest word every time
  for (const sc of [
    { player: uncapped.word.length - 1, bot: 0 },
    { player: uncapped.word.length, bot: 0 },
    { player: 0, bot: 5 },
  ]) {
    const full = findBestMove(mercyBoard, mercyUsed, 'ru', 'hard', sc);
    assert(full !== null && full.word.length === uncapped.word.length,
      'hard at ' + sc.player + ':' + sc.bot + ': the longest move of ' + uncapped.word.length +
      ' letters is played uncapped (got ' + (full === null ? 'none' : full.word.length) + ')');
  }
} else {
  console.log('     no move longer than 5 letters appeared — the hard cap is not observable');
}

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

// the фалда sequence below is pinned to a fixed starting word
let s = freshGame('ru', 'балда');
assert(s.phase === 'idle' && s.usedWords.length === 1 && s.board[10] === 'б',
  'the game starts immediately: the starting word is in the middle row');
assert(s.tracks['балда'] !== undefined && s.tracks['балда'].join(',') === '10,11,12,13,14',
  "the starting word's track is the middle row");
assert(gameReducer(s, { type: 'NEW_GAME' }).usedWords.length === 1, 'NEW_GAME restarts the game');

// an empty cell with no letters around it (cell 0 on the starting board)
// cannot be chosen for the new letter
s = gameReducer(s, { type: 'CLICK_CELL', index: 0 });
assert(s.phase === 'idle' && s.selectedCell === null,
  'an isolated empty cell cannot be selected');

// the player plays "фалда", the computer replies "халда" (a constructed move)
s = gameReducer(s, { type: 'CLICK_CELL', index: 6 });
assert(s.phase === 'letter' && s.selectedCell === 6, 'a click on an empty cell opens letter input');
s = gameReducer(s, { type: 'CLICK_CELL', index: 0 });
assert(s.selectedCell === 6, 'the pending letter cannot be re-targeted to an isolated cell');
s = gameReducer(s, { type: 'CLICK_CELL', index: 18 });
assert(s.phase === 'letter' && s.selectedCell === 18,
  'in the letter phase a tap on another empty cell moves the pending letter there');
s = gameReducer(s, { type: 'CLICK_CELL', index: 6 });
assert(s.selectedCell === 6, 'the pending letter moves back the same way');
s = gameReducer(s, { type: 'SET_LETTER', char: 'ф' });
assert(s.phase === 'word' && s.numChar === 6 && s.board[6] === 'ф', 'the letter is placed and highlighted (numChar)');
const faldaPath = [6, 11, 12, 13, 14];
s = gameReducer(s, { type: 'DRAG_START', index: faldaPath[0] });
for (let k = 1; k < faldaPath.length; k++) s = gameReducer(s, { type: 'DRAG_CELL', index: faldaPath[k] });
assert(wordFromTrack(s.board, s.track) === 'фалда', 'the drag builds the word "фалда" cell by cell');
assert(gameReducer(s, { type: 'CLICK_CELL', index: 11 }) === s,
  'a click on a filled cell in the word phase does nothing (the drag is the only input)');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.phase === 'bot' && s.playerWords.length === 1 && s.error === null, 'a successful move switches to the bot phase');
assert(s.tracks['фалда'] !== undefined && s.tracks['фалда'].join(',') === '6,11,12,13,14',
  'the played word keeps its track');
s = gameReducer(s, { type: 'BOT_MOVED', move: { word: 'халда', char: 'х', index: 16, track: [16, 17, 12, 13, 14] } });
assert(s.phase === 'idle' && s.board[16] === 'х' && s.botWords.length === 1, 'BOT_MOVED writes the letter and the word');
assert(s.tracks['халда'] !== undefined && s.tracks['халда'].join(',') === '16,17,12,13,14',
  "the computer's word keeps its track");
assert(s.status !== null && s.status.kind === 'botMove' && s.status.word === 'халда',
  'BOT_MOVED reports the word in the status (structured, localized on render)');

// "word already used": a new "а" at cell 17, path х(16)-а(17)-л(12)-д(13)-а(14)
s = gameReducer(s, { type: 'CLICK_CELL', index: 17 });
s = gameReducer(s, { type: 'SET_LETTER', char: 'а' });
s = gameReducer(s, { type: 'DRAG_START', index: 16 });
for (const c of [17, 12, 13, 14]) s = gameReducer(s, { type: 'DRAG_CELL', index: c });
assert(wordFromTrack(s.board, s.track) === 'халда', 'the drag builds the word "халда"');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error !== null && s.error.code === 'wordUsed' && s.error.word === 'халда' && s.phase === 'word',
  'a repeated word is rejected with the wordUsed error');
assert(s.track.length === 5, 'a validation error keeps the path — the word can be redrawn');

// "Отмена" resets numChar (a fix over the original)
s = gameReducer(s, { type: 'CANCEL_MOVE' });
assert(s.phase === 'idle' && s.board[17] === '' && s.numChar === null, 'cancel rolls back the letter and numChar');
s = gameReducer(s, { type: 'SUBMIT_MOVE' });
assert(s.error !== null && s.error.code === 'addLetter', 'a move without a letter yields the addLetter error');

// --- reducer: drag-selection of the word (the DRAG_* actions of Board.tsx) ---

// phase gating: drags do nothing outside the word phase
const d0 = freshGame('ru', 'балда');
assert(gameReducer(d0, { type: 'DRAG_START', index: 10 }) === d0 &&
  gameReducer(d0, { type: 'DRAG_CELL', index: 11 }) === d0,
  'drag actions are no-ops outside the word phase');

// a full gesture for "фалда": anchor at the added letter, enter the cells
let d = freshGame('ru', 'балда');
d = gameReducer(d, { type: 'CLICK_CELL', index: 6 });
d = gameReducer(d, { type: 'SET_LETTER', char: 'ф' });
d = gameReducer(d, { type: 'DRAG_START', index: 6 });
assert(d.track.length === 1 && d.track[0] === 6, 'DRAG_START anchors an empty path at the pressed cell');
for (const c of [11, 12, 13, 14]) d = gameReducer(d, { type: 'DRAG_CELL', index: c });
assert(wordFromTrack(d.board, d.track) === 'фалда', 'the drag builds the word "фалда" cell by cell');
assert(gameReducer(d, { type: 'DRAG_CELL', index: 14 }) === d, 're-entering the tip of the path is a no-op');
assert(gameReducer(d, { type: 'DRAG_CELL', index: 10 }) === d, 'a non-adjacent filled cell is ignored mid-drag');
assert(gameReducer(d, { type: 'DRAG_CELL', index: 0 }) === d, 'an empty cell is ignored mid-drag');
d = gameReducer(d, { type: 'DRAG_CELL', index: 13 });
d = gameReducer(d, { type: 'DRAG_CELL', index: 12 });
assert(d.track.length === 3 && wordFromTrack(d.board, d.track) === 'фал', 'dragging back over the path unwinds it');
d = gameReducer(d, { type: 'DRAG_CELL', index: 6 });
assert(d.phase === 'word' && d.track.length === 1,
  'entering the added letter mid-drag unwinds to it — the keyboard never opens in a gesture');

// DRAG_START mid-path: next to the tip it extends, on the tip it is a no-op,
// on a path cell it rewinds to it, from an unrelated cell it replaces
d = gameReducer(d, { type: 'DRAG_START', index: 11 });
assert(d.track.length === 2 && wordFromTrack(d.board, d.track) === 'фа', 'a drag begun next to the tip extends the path');
assert(gameReducer(d, { type: 'DRAG_START', index: 11 }) === d, 'a drag begun on the tip changes nothing');
d = gameReducer(d, { type: 'DRAG_CELL', index: 12 });
d = gameReducer(d, { type: 'DRAG_START', index: 11 });
assert(d.track.length === 2 && wordFromTrack(d.board, d.track) === 'фа', 'a drag begun on a path cell rewinds to it');
d = gameReducer(d, { type: 'DRAG_START', index: 10 });
assert(d.track.length === 3 && wordFromTrack(d.board, d.track) === 'фаб', 'a drag from a cell next to the new tip extends again');
d = gameReducer(d, { type: 'DRAG_START', index: 14 });
assert(d.track.length === 1 && d.track[0] === 14, 'a drag from an unrelated cell replaces the path');

// a new drag clears a pending validation error
d = gameReducer(d, { type: 'SUBMIT_MOVE' });
assert(d.error !== null && d.error.code === 'noAddedLetter' && d.track.length === 1,
  'submitting the leftover drag fails, the path is kept');
d = gameReducer(d, { type: 'DRAG_CELL', index: 13 });
assert(d.error === null && d.track.length === 2, 'a drag edit clears the error');

// the release auto-submit: rebuild "фалда" with drags and let go
d = gameReducer(d, { type: 'DRAG_START', index: 6 }); // unrelated to the tip — replaces
for (const c of [11, 12, 13, 14]) d = gameReducer(d, { type: 'DRAG_CELL', index: c });
assert(wordFromTrack(d.board, d.track) === 'фалда', 'the path is rebuilt with drags alone');
d = gameReducer(d, { type: 'SUBMIT_MOVE' });
assert(d.playerWords.length === 1 && d.phase === 'bot' && d.track.length === 0,
  'the release auto-submit plays the dragged word');


// --- reducer: the added letter can be changed (the keyboard reopened on its cell) ---
let k = freshGame('ru', 'балда');
k = gameReducer(k, { type: 'CLICK_CELL', index: 6 });
const dismissed = gameReducer(k, { type: 'CLICK_CELL', index: 6 });
assert(dismissed.phase === 'idle' && dismissed.selectedCell === null && dismissed.boardBackup === null,
  'a tap on the selected cell dismisses the open letter keyboard');
k = gameReducer(k, { type: 'SET_LETTER', char: 'ф' });
k = gameReducer(k, { type: 'DRAG_START', index: 6 });
for (const c of [11, 12, 13]) k = gameReducer(k, { type: 'DRAG_CELL', index: c });
k = gameReducer(k, { type: 'SUBMIT_MOVE' });
assert(k.error !== null && k.error.code === 'wordNotFound' && wordFromTrack(k.board, k.track) === 'фалд',
  '"фалд" is not a word — the error is kept with the path');
k = gameReducer(k, { type: 'CLICK_CELL', index: 6 });
assert(k.phase === 'word' && k.selectedCell === 6,
  'a tap on the added letter reopens the keyboard anchored there');
const closed = gameReducer(k, { type: 'CLICK_CELL', index: 11 });
assert(closed.phase === 'word' && closed.selectedCell === null && closed.board[6] === 'ф' &&
  wordFromTrack(closed.board, closed.track) === 'фалд',
  'any cell tap closes the reopened panel — the letter and the path stay');
k = gameReducer(k, { type: 'SET_LETTER', char: 'м' });
assert(k.phase === 'word' && k.numChar === 6 && k.selectedCell === null && k.board[6] === 'м' &&
  k.track.length === 0 && k.error === null,
  'a changed letter replaces the added one and resets the path; the error clears');
// redraw "малд", then pick the same letter — the word must survive this time
k = gameReducer(k, { type: 'DRAG_START', index: 6 });
for (const c of [11, 12, 13]) k = gameReducer(k, { type: 'DRAG_CELL', index: c });
assert(wordFromTrack(k.board, k.track) === 'малд', '"малд" is drawn again after the reset');
k = gameReducer(k, { type: 'CLICK_CELL', index: 6 });
k = gameReducer(k, { type: 'SET_LETTER', char: 'м' });
assert(k.selectedCell === null && wordFromTrack(k.board, k.track) === 'малд',
  'picking the same letter keeps the drawn word');
const reopened = gameReducer(k, { type: 'CLICK_CELL', index: 6 });
const dragged = gameReducer(reopened, { type: 'DRAG_START', index: 6 });
assert(dragged.phase === 'word' && dragged.selectedCell === null && dragged.track.length === 1,
  'a begun drag closes the reopened keyboard and rewinds to its start cell');
const escaped = gameReducer(reopened, { type: 'CLOSE_KEYBOARD' });
assert(escaped.phase === 'word' && escaped.selectedCell === null && escaped.board[6] === 'м' &&
  escaped.track.length === 4,
  'CLOSE_KEYBOARD (Escape) dismisses the panel without touching the move');


// --- reducer: the added letter moves to another legal spot without «Отмена» ---
let mv = freshGame('ru', 'балда');
mv = gameReducer(mv, { type: 'CLICK_CELL', index: 6 });
mv = gameReducer(mv, { type: 'SET_LETTER', char: 'ф' });
mv = gameReducer(mv, { type: 'DRAG_START', index: 6 });
for (const c of [11, 12, 13]) mv = gameReducer(mv, { type: 'DRAG_CELL', index: c });
mv = gameReducer(mv, { type: 'SUBMIT_MOVE' }); // "фалд" is not a word
assert(mv.error !== null && mv.error.code === 'wordNotFound' && mv.track.length === 4,
  'move fixture: "ф" at cell 6, a path drawn, a stale error showing');
mv = gameReducer(mv, { type: 'CLICK_CELL', index: 18 });
assert(mv.phase === 'word' && mv.numChar === 18 && mv.board[18] === 'ф' && mv.board[6] === '' &&
  mv.track.length === 0 && mv.selectedCell === 18 && mv.error === null && mv.boardBackup !== null,
  'a tap on another legal spot moves the added letter there and reopens the keyboard on it');
mv = gameReducer(mv, { type: 'SET_LETTER', char: 'ф' });
assert(mv.phase === 'word' && mv.numChar === 18 && mv.board[18] === 'ф' && mv.selectedCell === null,
  'picking the letter again at its new cell keeps it and closes the keyboard');
// with the panel open on the moved letter, a tap on a legal spot moves it again
mv = gameReducer(mv, { type: 'CLICK_CELL', index: 18 });
mv = gameReducer(mv, { type: 'CLICK_CELL', index: 17 });
assert(mv.numChar === 17 && mv.board[17] === 'ф' && mv.board[18] === '' && mv.selectedCell === 17,
  'with the panel open, a tap on a legal spot moves the letter and the panel follows');
const closedAt = gameReducer(mv, { type: 'CLICK_CELL', index: 17 });
assert(closedAt.phase === 'word' && closedAt.selectedCell === null && closedAt.board[17] === 'ф',
  'a tap on the letter cell itself still just closes the panel');
assert(gameReducer(mv, { type: 'CLICK_CELL', index: 0 }) === mv &&
  gameReducer(mv, { type: 'CLICK_CELL', index: 22 }) === mv,
  'with the panel open, a tap on an empty cell that cannot take the letter does not close it');
assert(gameReducer(closedAt, { type: 'CLICK_CELL', index: 0 }) === closedAt,
  'a cell with no letters around (on the board before the letter) is not a legal spot');
assert(gameReducer(closedAt, { type: 'CLICK_CELL', index: 22 }) === closedAt,
  'a cell that only adjoins the added letter itself is not a legal spot — it would end up isolated');
const keptEscape = gameReducer(mv, { type: 'CLOSE_KEYBOARD' });
assert(keptEscape.phase === 'word' && keptEscape.board[17] === 'ф' && keptEscape.selectedCell === null,
  'Escape from the reopened keyboard only closes it — the moved letter stays');
const back = gameReducer(closedAt, { type: 'CANCEL_MOVE' });
assert(back.phase === 'idle' && back.board[17] === '' && back.board[6] === '' && back.numChar === null,
  '«Отмена» rolls the letter back from wherever it stands');


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
  if (path2 !== null) {
    s = gameReducer(s, { type: 'DRAG_START', index: path2[0] });
    for (let k = 1; k < path2.length; k++) s = gameReducer(s, { type: 'DRAG_CELL', index: path2[k] });
  }
  s = gameReducer(s, { type: 'SUBMIT_MOVE' });
  assert(s.phase === 'bot', "the player's move is accepted (bot phase)");
  s = gameReducer(s, { type: 'BOT_MOVED', move: null });
  assert(s.phase === 'idle' && s.status !== null, 'no move for the bot — the turn is skipped without a crash');
}

// --- a full game to the end through the reducer (both sides play the best move) ---
// a fixed starting word keeps this run deterministic
let g = freshGame('ru', 'балда');
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
    g = gameReducer(g, { type: 'DRAG_START', index: path[0] });
    for (let k = 1; k < path.length; k++) g = gameReducer(g, { type: 'DRAG_CELL', index: path[k] });
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

// --- the saved game (state/persist.ts) ---

// node has no localStorage; persist.ts only touches it inside its functions,
// so a minimal in-memory stand-in installed here is enough
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

// a game in progress: "фалда" played from the reference position above
let p = freshGame('ru', START_WORD);
p = gameReducer(p, { type: 'CLICK_CELL', index: 6 });
p = gameReducer(p, { type: 'SET_LETTER', char: 'ф' });
p = gameReducer(p, { type: 'DRAG_START', index: 6 });
for (const c of [11, 12, 13, 14]) p = gameReducer(p, { type: 'DRAG_CELL', index: c });
p = gameReducer(p, { type: 'SUBMIT_MOVE' });
assert(p.phase === 'bot' && p.playerWords.length === 1, 'persist fixture: a word is played (' + p.playerWords[0] + ')');

saveGame(p);
const restored = loadGame('ru');
assert(restored !== null, 'the played game is restored from storage');
assert(restored !== null && restored.board.join('') === p.board.join(''), 'the restored board matches the saved one');
assert(restored !== null && restored.usedWords.join(',') === p.usedWords.join(','), 'the restored usedWords match');
assert(restored !== null && restored.playerWords.join(',') === p.playerWords.join(','), 'the restored playerWords match');
assert(restored !== null &&
  restored.tracks['балда']?.join(',') === '10,11,12,13,14' &&
  restored.tracks['фалда']?.join(',') === '6,11,12,13,14',
  'the restored tracks match: the starting word and the played word');
// the bot phase is never restored: the computer forfeits the answer it owed
assert(restored !== null && restored.phase === 'idle', 'a saved bot phase comes back as idle (phase=' + (restored ? restored.phase : '-') + ')');
assert(restored !== null && restored.track.length === 0 && restored.numChar === null &&
  restored.selectedCell === null && restored.boardBackup === null,
  'the transient move fields come back empty');
assert(loadGame('en') === null, 'a russian save is not offered to an english game');

// a move in progress is rolled back into the snapshot, not stored half-made
let q = gameReducer(restored!, { type: 'CLICK_CELL', index: 17 });
q = gameReducer(q, { type: 'SET_LETTER', char: 'а' });
assert(q.board[17] === 'а', 'persist fixture: the pending letter is on the board');
saveGame(q);
const rolled = loadGame('ru');
assert(rolled !== null && rolled.board[17] === '', 'the pending letter is rolled back out of the snapshot');
assert(rolled !== null && rolled.board.join('') === restored!.board.join(''), 'the rolled-back board equals the board before the move');

// the finished game keeps its phase, so the end panel comes back
saveGame({ ...p, phase: 'over' });
assert(loadGame('ru')?.phase === 'over', 'a finished game is restored as over');

// a game still on its starting word is not worth restoring — and clears the slot
saveGame(freshGame('ru', START_WORD));
assert(loadGame('ru') === null, 'a game on its starting word is not saved');

// corrupt or foreign data never reaches the reducer
store.set('balda-game', 'not json at all');
assert(loadGame('ru') === null, 'unparsable storage is ignored');
store.set('balda-game', JSON.stringify({ v: 2, lang: 'ru', over: false, board: ['а'], usedWords: ['балда'], playerWords: [], botWords: [], tracks: {} }));
assert(loadGame('ru') === null, 'a board of the wrong size is rejected');
store.set('balda-game', JSON.stringify({ v: 999, lang: 'ru', over: false, board: new Array(25).fill(''), usedWords: ['балда'], playerWords: [], botWords: [], tracks: {} }));
assert(loadGame('ru') === null, 'a snapshot of another version is rejected');
store.set('balda-game', JSON.stringify({ v: 2, lang: 'ru', over: false, board: new Array(25).fill(''), usedWords: ['балда'], playerWords: [], botWords: [], tracks: { 'балда': [99] } }));
assert(loadGame('ru') === null, 'a track with an out-of-range cell is rejected');

// initGame falls back to a fresh game when there is nothing to restore
clearGame();
const fresh = initGame('ru');
assert(fresh.usedWords.length === 1 && fresh.phase === 'idle', 'initGame starts a new game with no save');
saveGame(p);
assert(initGame('ru').usedWords.length === p.usedWords.length, 'initGame returns the saved game when there is one');

// --- the game history (state/history.ts) ---

clearHistory();
assert(listGames().length === 0, 'the history starts empty');

// only finished games are archived — the game in progress above is not
addGame(p);
assert(listGames().length === 0, 'a game in progress is not archived');

// the finished game of the simulation above lands in the history, whole
addGame(g);
const archived = listGames();
assert(archived.length === 1, 'the finished game is archived');
assert(archived.length === 1 &&
  archived[0].lang === g.lang &&
  archived[0].board.join('') === g.board.join('') &&
  archived[0].usedWords.join(',') === g.usedWords.join(',') &&
  archived[0].playerWords.join(',') === g.playerWords.join(',') &&
  archived[0].botWords.join(',') === g.botWords.join(','),
  'the archived entry holds the game\'s board, words and language');
assert(archived.length === 1 &&
  JSON.stringify(archived[0].tracks) === JSON.stringify(g.tracks),
  'the archived entry holds the word tracks');

// an exact re-archive is a no-op: loading the game back re-fires the archiving
// effect on its phase change, and the same game must not land twice
addGame(g);
assert(listGames().length === 1, 'the same game archived twice stays one entry');

// the entry restores as the finished game itself
const loaded = entryToState(archived[0]);
assert(loaded.phase === 'over' &&
  loaded.board.join('') === g.board.join('') &&
  loaded.usedWords.join(',') === g.usedWords.join(','),
  'entryToState restores the board, the words and the over phase');
assert(loaded.track.length === 0 && loaded.numChar === null && loaded.selectedCell === null &&
  loaded.boardBackup === null && loaded.lastBotMove === null,
  'entryToState rebuilds the transient fields empty');
assert(gameReducer(freshGame('ru', START_WORD), { type: 'LOAD_GAME', game: loaded }) === loaded,
  'LOAD_GAME replaces the state with the loaded game');

// the cap: only the newest MAX_GAMES games stay, the oldest fall off. The
// variants are built small — an entry's word count is capped at 21 like the
// game's own, and the duplicate check knows a game by its words
clearHistory();
for (let i = 0; i < MAX_GAMES + 2; i++)
  addGame({ ...freshGame('ru', START_WORD), phase: 'over', usedWords: [START_WORD, 'игра' + i] });
const capped = listGames();
assert(capped.length === MAX_GAMES,
  'the history is capped at ' + MAX_GAMES + ' games (got ' + capped.length + ')');
assert(capped.length === MAX_GAMES && capped[0].usedWords[1] === 'игра' + (MAX_GAMES + 1),
  'the newest game stays on top');
assert(capped.every((e) => e.usedWords[1] !== 'игра0'),
  'the oldest games beyond the cap are dropped');

// corrupt storage never reaches the modal
store.set('balda-history', 'not json at all');
assert(listGames().length === 0, 'unparsable history is ignored');
store.set('balda-history', JSON.stringify({ v: 999, games: [] }));
assert(listGames().length === 0, 'a history of another version is rejected');

// one corrupt entry among valid ones is dropped on read, the rest survive
addGame(g);
const rawHistory = JSON.parse(store.get('balda-history')!);
rawHistory.games.push({ v: 1, junk: true });
store.set('balda-history', JSON.stringify(rawHistory));
const filtered = listGames();
assert(filtered.length === 1 && filtered[0].usedWords.join(',') === g.usedWords.join(','),
  'a corrupt entry is dropped, the valid ones survive');
clearHistory();

// a removal (the row's ⋮ menu): the tapped game leaves, the others survive;
// a timestamp matching nothing is a no-op; the last removal empties the slot
addGame({ ...freshGame('ru', START_WORD), phase: 'over', usedWords: [START_WORD, 'игра1'] });
addGame({ ...freshGame('ru', START_WORD), phase: 'over', usedWords: [START_WORD, 'игра2'] });
addGame({ ...freshGame('ru', START_WORD), phase: 'over', usedWords: [START_WORD, 'игра3'] });
// a fast loop can stamp two games with the same millisecond — space the
// timestamps apart so a removal targets exactly one entry
const rawTimes = JSON.parse(store.get('balda-history')!);
rawTimes.games.forEach((entry: { at: number }, i: number) => { entry.at = 1000 + i; });
store.set('balda-history', JSON.stringify(rawTimes));
removeGame(1001);
const afterRemove = listGames();
assert(afterRemove.length === 2 && afterRemove.every((e) => e.usedWords[1] !== 'игра2'),
  'removeGame drops only the game it was given');
removeGame(99999);
assert(listGames().length === 2, 'removing an unknown timestamp is a no-op');
removeGame(afterRemove[0].at);
removeGame(afterRemove[1].at);
assert(listGames().length === 0 && store.get('balda-history') === undefined,
  'removing the last games clears the slot');
clearHistory();

if (failures > 0) {
  console.error('\nFailed checks: ' + failures);
  throw new Error('check failed');
}
console.log('\nAll checks passed');
