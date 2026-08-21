// Per-language game configuration: the alphabet, the random starting word and
// the dictionary with its lookup structure. The footer language switcher
// (src/lang.ts) restarts the game with the other language's config — the
// board, the words already played and the alphabet are language-bound.
import { dictionary as dictionaryRu } from './dictionary';
import { dictionary as dictionaryEn } from './dictionary-en';
import { createDic, type Dic } from './dic';
import { SIZE } from './constants';

export type Lang = 'ru' | 'en';

interface LangConf {
  alphabet: string;
  words: string[];
}

// Russian: 32 letters, no "ё" (as in the original). English: 26 letters.
const LANG_CONF: Record<Lang, LangConf> = {
  ru: {
    alphabet: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
    words: dictionaryRu,
  },
  en: {
    alphabet: 'abcdefghijklmnopqrstuvwxyz',
    words: dictionaryEn,
  },
};

export function alphabetFor(lang: Lang): string {
  return LANG_CONF[lang].alphabet;
}

// the starting word is drawn at random from the dictionary words that fill
// the middle row exactly (the original always started with a fixed word).
// The candidates are collected once per language.
const startWordCache = new Map<Lang, string[]>();

export function startWordFor(lang: Lang): string {
  let candidates = startWordCache.get(lang);
  if (candidates === undefined) {
    candidates = LANG_CONF[lang].words.filter((w) => w.length === SIZE);
    startWordCache.set(lang, candidates);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// the dictionary trees are built once per language, on first use
const dicCache = new Map<Lang, Dic>();

export function dicFor(lang: Lang): Dic {
  let d = dicCache.get(lang);
  if (d === undefined) {
    const conf = LANG_CONF[lang];
    d = createDic(conf.words, conf.alphabet);
    dicCache.set(lang, d);
  }
  return d;
}
