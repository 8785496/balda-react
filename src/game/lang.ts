// Per-language game configuration: the alphabet, the starting word and the
// dictionary with its lookup structure. The footer language switcher
// (src/lang.ts) restarts the game with the other language's config — the
// board, the words already played and the alphabet are language-bound.
import { dictionary as dictionaryRu } from './dictionary';
import { dictionary as dictionaryEn } from './dictionary-en';
import { createDic, type Dic } from './dic';

export type Lang = 'ru' | 'en';

interface LangConf {
  alphabet: string;
  startWord: string;
  words: string[];
}

// Russian: 32 letters, no "ё" (as in the original). English: 26 letters.
const LANG_CONF: Record<Lang, LangConf> = {
  ru: {
    alphabet: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
    startWord: 'балда',
    words: dictionaryRu,
  },
  en: {
    alphabet: 'abcdefghijklmnopqrstuvwxyz',
    startWord: 'crane',
    words: dictionaryEn,
  },
};

export function alphabetFor(lang: Lang): string {
  return LANG_CONF[lang].alphabet;
}

export function startWordFor(lang: Lang): string {
  return LANG_CONF[lang].startWord;
}

// the hash arrays are built once per language, on first use
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
