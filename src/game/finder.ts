// Move search for the computer — a TypeScript port of js/track2.js.
// The algorithm is ported unchanged: for every empty cell adjacent to a
// non-empty one, every alphabet letter is substituted; from every non-empty
// cell a recursive path search runs in 4 directions; a path must not cross
// itself, and a branch is pruned when no word starts with the current prefix.
// Returns a word that contains the added letter and has not been used before.
// Differences from the original: the board is passed as an array (no DOM
// reads), the top-neighbor check is fixed (i > 5 → i >= 5), when no move
// exists null is returned instead of crashing, instead of tracking only
// the longest word every found word is recorded (deduplicated by word) so
// that the difficulty can choose among them (see pickMove for the caps),
// and the prefix check walks the dictionary tree
// (dic.ts) one letter per step instead of re-hashing the whole prefix and
// binary-searching it from scratch at every cell.
import { alphabetFor, dicFor, type Lang } from './lang';
import { SIZE } from './constants';
import type { Difficulty } from '../difficulty';
import type { TrieNode } from './dic';

export interface BotMove {
  word: string;
  char: string;
  index: number;
  track: number[]; // the word's path on the board — for the move highlight
}

export function findBestMove(
  board: string[],
  usedWords: string[],
  lang: Lang = 'ru',
  difficulty: Difficulty = 'hard',
  playerLosing: boolean = false, // caps hard at 5-letter words (see pickMove)
): BotMove | null {
  const dic = dicFor(lang);
  const alphabet = alphabetFor(lang);
  // every found word with one of its paths, in discovery order
  const found: BotMove[] = [];
  const seenWords = new Set<string>();

  // recursive path search
  // arrData — board data, arrWord — path coordinates,
  // cur — index of the current cell, ins — index of the cell with the substituted letter,
  // node — the dictionary tree node of the path before the current cell's letter
  function findTrack(arrData: string[], arrWord: number[], cur: number, ins: number, node: TrieNode): void {
    if (arrData[cur] === '') // the current cell is empty
      return;
    // a path must not cross itself
    if (arrWord.length > 0 && arrWord.indexOf(cur) !== -1)
      return;
    // step the tree with the current cell's letter
    const next = dic.step(node, arrData[cur]);
    if (next === null) // no dictionary word continues with this letter
      return;
    // add the current cell to the path
    arrWord.push(cur);
    // the path contains the added letter and spells a dictionary word
    if (next.word && arrWord.indexOf(ins) !== -1) {
      let word = '';
      for (let k = 0; k < arrWord.length; k++)
        word += arrData[arrWord[k]];
      // the word has not been played yet
      if (!seenWords.has(word))
        if (usedWords.indexOf(word) === -1) {
          seenWords.add(word);
          found.push({ word, char: arrData[ins], index: ins, track: arrWord.slice() });
        }
    }
    // no point in searching further: no longer word shares this prefix
    if (next.children === null)
      return;
    // recurse in 4 directions
    if (cur < SIZE * (SIZE - 1))
      findTrack(arrData, arrWord.slice(), cur + SIZE, ins, next);
    if (cur >= SIZE)
      findTrack(arrData, arrWord.slice(), cur - SIZE, ins, next);
    if (cur % SIZE < SIZE - 1)
      findTrack(arrData, arrWord.slice(), cur + 1, ins, next);
    if (cur % SIZE > 0)
      findTrack(arrData, arrWord.slice(), cur - 1, ins, next);
  }

  // substitution loop
  for (let i = 0; i < board.length; i++) {
    // an empty cell with a non-empty neighbor (fixed i > 5 → i >= 5)
    if (!board[i] && (
      (i < SIZE * (SIZE - 1) && board[i + SIZE]) ||
      (i >= SIZE && board[i - SIZE]) ||
      (i % SIZE < SIZE - 1 && board[i + 1]) ||
      (i % SIZE > 0 && board[i - 1])
    )) {
      for (let k = 0; k < alphabet.length; k++) {
        const arrTemp = board.slice();
        arrTemp[i] = alphabet[k];
        // search paths starting from non-empty cells
        for (let j = 0; j < board.length; j++)
          if (arrTemp[j] !== '')
            findTrack(arrTemp, [], j, i, dic.root);
      }
    }
  }

  return pickMove(found, difficulty, playerLosing);
}

// which of the found moves the difficulty plays:
//   easy — a random word of at most 3 letters;
//   medium — a random word of at most 4 letters;
//   hard — the longest word, but of at most 5 letters while the player is
//     losing (the original's uncapped longest-word behavior otherwise);
//   when no found word fits a difficulty's cap, the shortest one is played.
function pickMove(found: BotMove[], difficulty: Difficulty, playerLosing: boolean): BotMove | null {
  if (found.length === 0)
    return null;
  const cap = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : playerLosing ? 5 : Infinity;
  if (difficulty === 'hard') {
    // the longest word within the cap, the first found among equals (as in the original)
    let best: BotMove | null = null;
    for (let i = 0; i < found.length; i++)
      if (found[i].word.length <= cap && (best === null || found[i].word.length > best.word.length))
        best = found[i];
    return best !== null ? best : shortestMove(found);
  }
  // a random word within the cap
  const pool = found.filter((m) => m.word.length <= cap);
  if (pool.length === 0) // nothing fits — the shortest word there is
    return shortestMove(found);
  return pool[Math.floor(Math.random() * pool.length)];
}

// the shortest word, the first found among equals
function shortestMove(found: BotMove[]): BotMove {
  let best = found[0];
  for (let i = 1; i < found.length; i++)
    if (found[i].word.length < best.word.length)
      best = found[i];
  return best;
}
