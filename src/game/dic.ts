// Dictionary and word lookup — a rework of js/dictionary2.js.
// The original hashed words into sorted number arrays — the whole dictionary
// plus prefixes of lengths 2–9 — and looked them up with binary search; a
// hash was a base-32 number, (letter position in the alphabet + 1) × 32^i,
// recomputed for every lookup. Here the dictionary is a prefix tree (trie):
// a node per prefix, children indexed by the letter's position in the
// language alphabet. A lookup is a single walk from the root, and the move
// search (finder.ts) steps the tree one letter at a time as the board path
// grows, pruning a branch the moment no dictionary word continues the
// current prefix. Still a factory: the game ships two dictionaries
// (Russian/English, see lang.ts), each getting its own tree built once, on
// first use.

// Maximum word length in the tree: longer dictionary words are ignored (as in the original)
const MAX_WORD_LEN = 10;

// char-code table size: covers the latin and russian (а..я, up to U+044F) lowercase
const CODE_TABLE_SIZE = 0x450;

export interface TrieNode {
  // some dictionary word ends at this node
  word: boolean;
  // children indexed by the letter's position in the alphabet; null while
  // childless — no dictionary word continues through this node
  children: (TrieNode | undefined)[] | null;
}

export interface Dic {
  // look up a whole word in the dictionary
  findWord(word: string): boolean;
  // look up a word part: whether any longer word starts with the given prefix
  hasPrefix(req: string): boolean;
  // the tree root — where the one-letter stepping of the move search starts
  root: TrieNode;
  // one letter of the walk: the child of node by char,
  // or null when no dictionary word continues with this letter
  step(node: TrieNode, char: string): TrieNode | null;
}

export function createDic(dictionary: string[], alphabet: string): Dic {
  // char code → alphabet position, -1 outside the alphabet
  const codeIndex = new Int8Array(CODE_TABLE_SIZE).fill(-1);
  for (let i = 0; i < alphabet.length; i++)
    codeIndex[alphabet.charCodeAt(i)] = i;

  const root: TrieNode = { word: false, children: null };

  function letterIndex(ch: string): number {
    const code = ch.charCodeAt(0);
    return code < CODE_TABLE_SIZE ? codeIndex[code] : -1;
  }

  // build the tree: words of 2..10 alphabet letters, as in the original's hashes
  for (const word of dictionary) {
    if (word.length < 2 || word.length > MAX_WORD_LEN)
      continue;
    let inAlphabet = true;
    for (let i = 0; i < word.length; i++)
      if (letterIndex(word[i]) < 0) {
        inAlphabet = false;
        break;
      }
    if (!inAlphabet)
      continue;
    // insert the word as a chain of nodes, marking the last one
    let node = root;
    for (let i = 0; i < word.length; i++) {
      if (node.children === null)
        node.children = new Array<TrieNode | undefined>(alphabet.length).fill(undefined);
      const idx = letterIndex(word[i]);
      let next = node.children[idx];
      if (next === undefined) {
        next = { word: false, children: null };
        node.children[idx] = next;
      }
      node = next;
    }
    node.word = true;
  }

  function step(node: TrieNode, char: string): TrieNode | null {
    const children = node.children;
    if (children === null)
      return null;
    const idx = letterIndex(char);
    if (idx < 0)
      return null;
    const next = children[idx];
    return next === undefined ? null : next;
  }

  // walk the tree along the whole string; null where no word shares it
  function walk(str: string): TrieNode | null {
    let node: TrieNode | null = root;
    for (let i = 0; i < str.length; i++) {
      node = step(node, str[i]);
      if (node === null)
        return null;
    }
    return node;
  }

  return {
    findWord(word: string): boolean {
      // the tree holds words of 2..MAX_WORD_LEN letters — as in the original,
      // a longer word is not looked up at all
      if (word.length < 2 || word.length > MAX_WORD_LEN)
        return false;
      const node = walk(word);
      return node !== null && node.word;
    },
    hasPrefix(req: string): boolean {
      const node = walk(req);
      // a childless node ends every word beneath it — the prefix cannot grow
      return node !== null && node.children !== null;
    },
    root,
    step,
  };
}
