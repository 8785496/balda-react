// Dictionary and word lookup — a TypeScript port of js/dictionary2.js.
// A string is hashed as a base-32 number: (letter position in the alphabet + 1) × 32^i,
// where i counts from the end of the string. On load, sorted hash arrays are built:
// the full dictionary and prefix arrays of lengths 2–9; lookup is a classic binary search.
import { dictionary } from './dictionary';
import { ALPHABET } from './constants';

// Maximum word length in the hashes: longer dictionary words are ignored (as in the original)
const MAX_WORD_LEN = 10;

// hash of a string as a base-32 number
function str2hash(str: string): number {
  let id = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const sym = str[len - i - 1];
    id += (ALPHABET.indexOf(sym) + 1) * Math.pow(32, i);
  }
  return id;
}

// classic binary search (ported from the original)
function findHash(searchKey: number, hash: number[]): boolean {
  let lowerBound = 0;
  let upperBound = hash.length - 1;
  let curIn: number;
  while (true) {
    curIn = Math.floor((lowerBound + upperBound) / 2);
    if (hash[curIn] === searchKey)
      return true; // element found
    else if (lowerBound > upperBound)
      return false; // element not found
    // divide the range
    if (hash[curIn] < searchKey)
      lowerBound = curIn + 1; // in the upper half
    else
      upperBound = curIn - 1; // in the lower half
  }
}

// full dictionary (words of length 2..10)
const dic_hash: number[] = [];
// prefix arrays: prefix_hash[n - 2] holds length-n prefixes of longer words
const prefix_hash: number[][] = [];
for (let n = 2; n <= 9; n++) prefix_hash.push([]);

// hash the dictionary
for (let i = 0; i < dictionary.length; i++) {
  if (dictionary[i].length > MAX_WORD_LEN) continue;
  if (dictionary[i].length > 1)
    dic_hash.push(str2hash(dictionary[i]));
  for (let n = 2; n <= 9; n++) {
    if (dictionary[i].length > n)
      prefix_hash[n - 2].push(str2hash(dictionary[i].substr(0, n)));
  }
}

// sort the arrays and drop adjacent duplicates
function compareNumbers(a: number, b: number): number {
  return a - b;
}

function sortUnique(hash: number[]): number[] {
  hash.sort(compareNumbers);
  const res: number[] = [];
  for (let i = 0; i < hash.length; i++)
    if (res.length === 0 || res[res.length - 1] !== hash[i])
      res.push(hash[i]);
  return res;
}

const dicSorted = sortUnique(dic_hash);
const prefixSorted = prefix_hash.map(sortUnique);

export const dic = {
  // look up a whole word in the dictionary
  findWord(word: string): boolean {
    return findHash(str2hash(word), dicSorted);
  },
  // look up a word part: whether any word starts with the given prefix
  hasPrefix(req: string): boolean {
    switch (req.length) {
      case 1:
        return ALPHABET.indexOf(req) !== -1;
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        return findHash(str2hash(req), prefixSorted[req.length - 2]);
      default:
        return false;
    }
  },
};
