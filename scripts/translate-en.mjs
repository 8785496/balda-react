// Generates src/game/translate-en.ts: for every word of the English game
// dictionary (src/game/dictionary-en.ts) a Russian translation and an IPA
// transcription, shown in the word popup (WordPopup.tsx) when an English word
// is tapped in the score lists or the status line.
//
// Sources, in order of precedence per field:
//  - transcription: ipa-dict en_US (MIT, https://github.com/open-dict-data/ipa-dict),
//    the gap filled from the Russian Wiktionary {{transcriptions}} and then
//    the English Wiktionary {{IPA}} of the same pages;
//  - translation: OpenRussian nouns reversed by their English glosses
//    (CC-BY-SA 4.0, https://github.com/Badestrand/russian-dictionary — a
//    Russian-noun table, so the reversed pairs are noun senses), the gap
//    filled from the Russian Wiktionary entries of the English words — the
//    «Значение» lists of their noun blocks, then of the adjective, verb and
//    adverb blocks (a word the noun sources miss is often translated only in
//    another sense) — and the remaining gap from the English Wiktionary's
//    translation tables {{t|ru|…}} of the same four sections, noun first.
//    The popup's part-of-speech marker follows the sense that won: noun
//    unless only another part of speech translated the word.
//
// Run from the repo root (Node.js >= 20.19, no dependencies):
//   node scripts/translate-en.mjs
// The fetched wikitext is cached in .tmp-translate/ (wiktionary.json for the
// Russian one, en-wiktionary.json for the English) — delete the folder to
// refetch it fresh. The downloads are read as files, not piped, same reason
// as the dictionary scripts (Windows pipes mangle UTF-8).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DICT = path.join(ROOT, 'src/game/dictionary-en.ts');
const OUT = path.join(ROOT, 'src/game/translate-en.ts');
const CACHE = path.join(ROOT, '.tmp-translate');
const UA = 'balda-react translate-en build (https://github.com/; dev machine)';

// how many translations a word carries at most — the popup is a quick glance,
// the Yandex link below them is the full lookup
const MAX_RU = 6;
const MAX_RU_OPENRUSSIAN = 4;

// part-of-speech codes: 'n' is never stored (it is the default), 'a'/'v'/'d'
// tag a translation that came from an adjective/verb/adverb sense
const POS_ORDER = ['n', 'a', 'v', 'd'];

// ---------- the game dictionary ----------

async function loadDictionary() {
  const src = await readFile(DICT, 'utf8');
  const last = src.trimEnd().split('\n').pop();
  const json = last.slice(last.indexOf('=') + 1).trim().replace(/;$/, '');
  return JSON.parse(json);
}

// ---------- downloads ----------

async function fetchText(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function downloadCached(name, url) {
  const file = path.join(CACHE, name);
  if (existsSync(file)) return readFile(file, 'utf8');
  const text = await fetchText(url);
  await writeFile(file, text, 'utf8');
  return text;
}

// ipa-dict: "word\t/IPA/" (variants after commas — the first is taken)
function loadIpa(text, dictSet) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const word = line.slice(0, tab);
    if (!dictSet.has(word) || map.has(word)) continue;
    const m = line.slice(tab + 1).match(/\/([^/]+)\//);
    if (m) map.set(word, m[1].trim());
  }
  return map;
}

// OpenRussian nouns.csv: TSV, bare(0) … translations_en(2) — "person, people;
// man". Reversed by the gloss tokens: english lemma → russian nouns.
function loadOpenRussian(text, dictSet) {
  const map = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    const ru = cols[0].replace(/\u0301/g, '').trim();
    for (let gloss of cols[2].split(/[;,]/)) {
      gloss = gloss.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!/^[a-z][a-z -]*$/.test(gloss) || !dictSet.has(gloss)) continue;
      const list = map.get(gloss) ?? [];
      if (!list.includes(ru) && list.length < MAX_RU_OPENRUSSIAN) list.push(ru);
      map.set(gloss, list);
    }
  }
  return map;
}

// ---------- wiktionaries (shared page fetching) ----------

// 50 titles per query is the API's limit for ordinary users
const WIKT_BATCH = 50;

// the fetched wikitext, cached across runs (the fetch is the slow part);
// a Map serialized as [word, text|null] pairs
async function loadWikt(host, cacheName, pages) {
  const file = path.join(CACHE, cacheName);
  const cached = existsSync(file)
    ? new Map(JSON.parse(await readFile(file, 'utf8')))
    : new Map();
  const need = pages.filter((w) => !cached.has(w));
  for (let i = 0; i < need.length; i += WIKT_BATCH) {
    const batch = need.slice(i, i + WIKT_BATCH);
    const url =
      `https://${host}/w/api.php?action=query&format=json&formatversion=2&redirects=1` +
      '&prop=revisions&rvprop=content&rvslots=main&titles=' +
      encodeURIComponent(batch.join('|'));
    const j = JSON.parse(await fetchText(url));
    // a requested title reaches its page through normalization (case) and
    // maybe a redirect; pages are keyed by the chain's end title
    const hop = new Map();
    for (const n of j.query.normalized ?? []) hop.set(n.from, n.to);
    for (const r of j.query.redirects ?? []) hop.set(r.from, r.to);
    const byTitle = new Map();
    for (const p of j.query.pages ?? [])
      byTitle.set(p.title, p.revisions?.[0]?.slots?.main?.content ?? null);
    for (const t of batch) {
      let end = t;
      for (let k = 0; k < 5 && hop.has(end); k++) end = hop.get(end);
      cached.set(t, byTitle.get(end) ?? null);
    }
    process.stderr.write(`${cacheName} ${Math.min(i + WIKT_BATCH, need.length)}/${need.length}\n`);
    await new Promise((r) => setTimeout(r, 150));
  }
  await writeFile(file, JSON.stringify([...cached]), 'utf8');
  return cached;
}

// ---------- the Russian Wiktionary ----------

// The {{-en-}} section of the page, or null when the entry is not an English
// word. The section runs to the next language header («= {{-xx-}} =»).
function ruEnSection(wikitext) {
  const m = wikitext.match(/= *\{\{-en-\}\} *=([\s\S]*?)(?== *\{\{-|\n__NOTOC__|$)/);
  return m ? m[1] : null;
}

// The {{transcriptions|…}} template's first non-empty, non-file, non-named
// argument, with the wiki's single-char affricates fixed into proper IPA ties.
function wiktIpa(section) {
  const m = section.match(/\{\{transcriptions\|([^\n]*?)\}\}/);
  if (!m) return '';
  for (let arg of m[1].split('|')) {
    arg = arg.trim();
    if (!arg || arg.includes('=') || /\.ogg$/.test(arg)) continue;
    return arg
      .replace(/ʦ/g, 't͡s')
      .replace(/ʧ/g, 't͡ʃ')
      .replace(/ʤ/g, 'd͡ʒ')
      .replace(/[.·]/g, '');
  }
  return '';
}

// Russian words from the section's POS blocks. A language section repeats per
// part of speech: a «=== Морфологические …» block, then semantics with the
// numbered definitions. A block's head names its POS template ({{сущ en}},
// {{прил en}}, {{гл en}}, {{нареч en}}, …); the definition lines are the
// Russian equivalents themselves — the wikilinks in them. Function words
// leak in as links of definition phrases («распределение [[по]] зонам») and
// are never a noun's translation — dropped by the stoplist. The noun blocks
// win; when they hold nothing, the adjective, verb and adverb ones follow.
const NOT_TRANSLATIONS = new Set([
  'и', 'в', 'во', 'не', 'ни', 'на', 'с', 'со', 'по', 'из', 'за', 'к', 'ко',
  'у', 'о', 'об', 'от', 'до', 'для', 'при', 'про', 'под', 'над', 'без', 'вне',
  'через', 'что', 'чтобы', 'как', 'же', 'бы', 'ли', 'или', 'но', 'а', 'то',
  'всё', 'все', 'этот', 'эта', 'эти', 'тот', 'та', 'те', 'свой', 'своя',
  'свои', 'который', 'которая', 'которое', 'которые', 'его', 'её', 'их',
  'один', 'одна', 'одно', 'два', 'две',
]);

const WIKT_RU_HEADS = [
  ['n', /сущ en|wdl-en-noun|en-noun|существительное/],
  ['a', /прил en|wdl-en-adj|en-adj|прилагательное/],
  ['v', /гл en|wdl-en-verb|en-verb|глагол/],
  ['d', /нареч en|wdl-en-adv|en-adv|наречие/],
];

function wiktRu(section) {
  const byPos = new Map(POS_ORDER.map((p) => [p, []]));
  const take = (ru, raw) => {
    // links carry the target's language anchor ([[анемия#Русский|анемия]])
    const word = raw.replace(/\u0301/g, '').split('#')[0].trim().toLowerCase();
    if (/^[а-яё][а-яё -]{0,24}$/.test(word) && !NOT_TRANSLATIONS.has(word) && !ru.includes(word))
      ru.push(word);
  };
  for (const chunk of section.split(/=== *Морфологические/).slice(1)) {
    const cut = chunk.indexOf('====');
    const head = chunk.slice(0, cut === -1 ? chunk.length : cut);
    const pos = WIKT_RU_HEADS.find(([, re]) => re.test(head))?.[0];
    if (!pos) continue;
    const ru = byPos.get(pos);
    for (const def of chunk.matchAll(/^#(?!#)\s*(.+)$/gm))
      for (const link of def[1].matchAll(/\[\[([^\]|]+)/g)) take(ru, link[1]);
    // stub entries define the word as a bare wikilink line, no list marker
    for (const bare of chunk.matchAll(/^[ \t]*\[\[([^\]|]+)(?:\|[^\]]*)?\]\][ \t]*$/gm))
      take(ru, bare[1]);
  }
  for (const pos of POS_ORDER) {
    const ru = byPos.get(pos);
    if (ru.length) return { pos, ru };
  }
  return { pos: '', ru: [] };
}

// ---------- the English Wiktionary ----------

// The ==English== section of the page, or '' when the entry is not an English
// word. The section runs to the next language header («== French ==»).
function enwiktEn(wikitext) {
  const m = wikitext.match(/== *English *==([\s\S]*?)(?=\n==[^=]|$)/);
  return m ? m[1] : '';
}

// A ===PartOfSpeech=== section, null when absent. The content runs to the
// next level-2/3 header, so the ====Translations==== subsections stay inside.
function enwiktPos(en, name) {
  const m = en.match(new RegExp('=== *' + name + ' *===([\\s\\S]*?)(?=\\n==[^=]|\\n===[^=]|$)'));
  return m ? m[1] : null;
}

// {{IPA|en|/…/|a=UK,US}} — the first slashed argument of the first template.
function enwiktIpa(en) {
  const m = en.match(/\{\{IPA\|en\|([^}]*)\}\}/);
  if (!m) return '';
  for (const arg of m[1].split('|')) {
    const a = arg.trim();
    if (a.length > 2 && a.startsWith('/') && a.endsWith('/')) return a.slice(1, -1);
  }
  return '';
}

// Russian translations from a section's translation tables: the {{t|ru|…}} /
// {{t+|ru|…}} pairs ({{t-check}} excluded — unverified). The Russian carries
// combining stress marks, and a multiword translation spans several arguments
// ({{t|ru|торговый|центр}}); gender and qualifier arguments are non-Cyrillic
// and drop out on their own.
function enwiktRu(section) {
  const ru = [];
  for (const m of section.matchAll(/\{\{t\+?\|ru\|([^}]*)/g)) {
    const parts = m[1]
      .split('|')
      .map((s) => s.replace(/\u0301/g, '').trim().toLowerCase())
      .filter((s) => /^[а-яё][а-яё -]*$/.test(s));
    if (!parts.length) continue;
    const w = parts.join(' ');
    if (!ru.includes(w)) ru.push(w);
  }
  return ru;
}

// ---------- composition ----------

async function main() {
  await mkdir(CACHE, { recursive: true });
  const dict = await loadDictionary();
  const dictSet = new Set(dict);

  const ipa = loadIpa(
    await downloadCached('en_US.txt', 'https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt'),
    dictSet,
  );
  const openRussian = loadOpenRussian(
    await downloadCached('openrussian-nouns.csv', 'https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/nouns.csv'),
    dictSet,
  );

  // every word starts with ipa-dict + OpenRussian; each gap is then filled by
  // the first wiktionary that has it — a word's translations all come from
  // one sense, and its pos records which
  const words = new Map(
    dict.map((w) => [w, { ru: [...(openRussian.get(w) ?? [])], pos: 'n', ipa: ipa.get(w) ?? '' }]),
  );

  // the Russian wiktionary is fetched for the words OpenRussian/ipa-dict left
  // incomplete; its pages can mend both fields — translations from the POS
  // blocks, IPA from {{transcriptions}}
  const ruPages = await loadWikt(
    'ru.wiktionary.org',
    'wiktionary.json',
    dict.filter((w) => !openRussian.has(w) || !ipa.has(w)),
  );
  for (const [word, text] of ruPages) {
    const e = words.get(word);
    if (!e || !text) continue;
    const section = ruEnSection(text);
    if (!section) continue;
    if (!e.ru.length) {
      const { pos, ru } = wiktRu(section);
      if (ru.length) {
        e.ru = ru;
        e.pos = pos;
      }
    }
    if (!e.ipa) e.ipa = wiktIpa(section);
  }

  // the English wiktionary is fetched for whatever gaps remain — its
  // translation tables and {{IPA}} close most of them
  const enPages = await loadWikt(
    'en.wiktionary.org',
    'en-wiktionary.json',
    dict.filter((w) => !words.get(w).ru.length || !words.get(w).ipa),
  );
  for (const [word, text] of enPages) {
    const e = words.get(word);
    if (!e || !text) continue;
    const en = enwiktEn(text);
    if (!en) continue;
    if (!e.ipa) e.ipa = enwiktIpa(en);
    if (!e.ru.length) {
      for (const [pos, name] of [
        ['n', 'Noun'],
        ['a', 'Adjective'],
        ['v', 'Verb'],
        ['d', 'Adverb'],
      ]) {
        const section = enwiktPos(en, name);
        if (section === null) continue;
        const ru = enwiktRu(section);
        if (ru.length) {
          e.ru = ru;
          e.pos = pos;
          break;
        }
      }
    }
  }

  const entries = new Map();
  const posCounts = { noun: 0, adj: 0, verb: 0, adv: 0 };
  for (const [word, e] of words) {
    if (e.ru.length > MAX_RU) e.ru.length = MAX_RU;
    if (!e.ru.length && !e.ipa) continue;
    let value = e.ipa + '|' + e.ru.join(',');
    if (e.ru.length && e.pos !== 'n') value += '|' + e.pos;
    entries.set(word, value);
    if (e.ru.length) posCounts[{ n: 'noun', a: 'adj', v: 'verb', d: 'adv' }[e.pos]]++;
  }
  const withRu = dict.filter((w) => words.get(w).ru.length).length;
  const withIpa = dict.filter((w) => words.get(w).ipa).length;
  process.stderr.write(
    `words: ${dict.length}; translated: ${withRu} (${JSON.stringify(posCounts)}); transcribed: ${withIpa}\n`,
  );

  const header = `// Russian translations and IPA transcriptions of the English game
// dictionary's words, for the word popup (WordPopup.tsx — an English word
// tapped in a score list or the status line). Generated by
// scripts/translate-en.mjs; regenerate with \`node scripts/translate-en.mjs\`
// after changing the English dictionary. Sources, per field:
//  - IPA: ipa-dict en_US (MIT, https://github.com/open-dict-data/ipa-dict),
//    the gaps filled from the Russian Wiktionary's {{transcriptions}}, then
//    the English Wiktionary's {{IPA}};
//  - translation: OpenRussian nouns reversed by their English glosses
//    (CC-BY-SA 4.0, https://github.com/Badestrand/russian-dictionary), the
//    gaps filled from the Russian Wiktionary entries of the English words —
//    the «Значение» lists of their noun blocks, then adjective, verb and
//    adverb ones — and the remaining gap from the English Wiktionary's
//    translation tables ({{t|ru|…}}) of the same sections, noun first. The
//    popup's marker follows the sense that supplied the translations: noun
//    unless only another part of speech had them.
// A value is "ipa|ru,ru" (a noun translation; either side may be empty) or
// "ipa|ru,ru|a"/"|v"/"|d" when an adjective/verb/adverb sense translated the
// word; only words with at least one of the two fields are listed.
`;
  const body = `
export interface Translation {
  ipa: string; // '' when no source had the word
  ru: string[];
  pos: 'noun' | 'adj' | 'verb' | 'adv'; // the sense the translations came from
}

export const EN_RU: Record<string, string> = ${JSON.stringify(Object.fromEntries(entries))};

const cache = new Map<string, Translation>();

const POS: Record<string, Translation['pos']> = { a: 'adj', v: 'verb', d: 'adv' };

export function translateEn(word: string): Translation | null {
  const value = EN_RU[word];
  if (value === undefined) return null;
  let t = cache.get(word);
  if (t === undefined) {
    const [ipa, ru, pos] = value.split('|');
    t = { ipa, ru: ru.split(',').filter(Boolean), pos: POS[pos] ?? 'noun' };
    cache.set(word, t);
  }
  return t;
}
`;
  await writeFile(OUT, header + body, 'utf8');
  process.stderr.write(`written ${OUT}\n`);
}

main();
