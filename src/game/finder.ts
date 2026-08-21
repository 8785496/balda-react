// Best-move search for the computer — a TypeScript port of js/track2.js.
// The algorithm is ported unchanged: for every empty cell adjacent to a
// non-empty one, every alphabet letter is substituted; from every non-empty
// cell a recursive path search runs in 4 directions; a path must not cross
// itself, and a branch is pruned when no word starts with the current prefix.
// Returns the longest word that contains the added letter and has not been
// used before.
// Differences from the original: the board is passed as an array (no DOM
// reads), the top-neighbor check is fixed (i > 5 → i >= 5), and when no move
// exists null is returned instead of crashing.
import { dic } from './dic';
import { ALPHABET, SIZE } from './constants';

export interface BotMove {
  word: string;
  char: string;
  index: number;
}

export function findBestMove(board: string[], usedWords: string[]): BotMove | null {
  // best word found so far
  let gWord = '';
  let gChar = '';
  let gIndex = -1;

  // recursive path search
  // arrData — board data, arrWord — path coordinates,
  // cur — index of the current cell, ins — index of the cell with the substituted letter
  function findTrack(arrData: string[], arrWord: number[], cur: number, ins: number): void {
    if (arrData[cur] === '') // the current cell is empty
      return;
    // a path must not cross itself
    if (arrWord.length > 0 && arrWord.indexOf(cur) !== -1)
      return;
    // add the current cell to the path
    arrWord.push(cur);
    if (arrWord.length > 1) {
      let word = '';
      for (let k = 0; k < arrWord.length; k++)
        word += arrData[arrWord[k]];
      // if the word is longer than the best one found and the path contains the added letter
      if (arrWord.length > gWord.length)
        if (arrWord.indexOf(ins) !== -1)
          if (dic.findWord(word))
            if (usedWords.indexOf(word) === -1) {
              gWord = word;
              gChar = arrData[ins];
              gIndex = ins;
            }
      // no point in searching further: no words share this prefix
      if (!dic.hasPrefix(word))
        return;
    }
    // recurse in 4 directions
    if (cur < SIZE * (SIZE - 1))
      findTrack(arrData, arrWord.slice(), cur + SIZE, ins);
    if (cur >= SIZE)
      findTrack(arrData, arrWord.slice(), cur - SIZE, ins);
    if (cur % SIZE < SIZE - 1)
      findTrack(arrData, arrWord.slice(), cur + 1, ins);
    if (cur % SIZE > 0)
      findTrack(arrData, arrWord.slice(), cur - 1, ins);
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
      for (let k = 0; k < ALPHABET.length; k++) {
        const arrTemp = board.slice();
        arrTemp[i] = ALPHABET[k];
        // search paths starting from non-empty cells
        for (let j = 0; j < board.length; j++)
          if (arrTemp[j] !== '')
            findTrack(arrTemp, [], j, i);
      }
    }
  }

  return gWord !== '' ? { word: gWord, char: gChar, index: gIndex } : null;
}
