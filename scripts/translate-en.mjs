// Generates src/game/translate-en.ts: for every word of the English game
// dictionary (src/game/dictionary-en.ts) a Russian translation and an IPA
// transcription, shown in the word popup (WordPopup.tsx) when an English word
// is tapped in the score lists or the status line.
//
// Sources, in order of precedence per field:
//  - transcription: ipa-dict en_US (MIT, https://github.com/open-dict-data/ipa-dict),
//    the gap filled from ru.wiktionary {{transcriptions}} of the same pages
//    fetched for the translations;
//  - translation: OpenRussian nouns reversed by their English glosses
//    (CC-BY-SA 4.0, https://github.com/Badestrand/russian-dictionary — a
//    Russian-noun table, so the reversed pairs are noun senses), the gap
//    filled from the Russian Wiktionary entries of the English words:
//    the {{-en-}} section's noun blocks, whose «Значение» lines are the
//    Russian equivalents themselves (CC-BY-SA).
//
// Run from the repo root (Node.js >= 20.19, no dependencies):
//   node scripts/translate-en.mjs
// The fetched Wiktionary wikitext is cached in .tmp-translate/ — delete the
// folder to refetch it fresh. The downloads are read as files, not piped,
// same reason as the dictionary scripts (Windows pipes mangle UTF-8).
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

// ---------- the Russian Wiktionary ----------

// 50 titles per query is the API's limit for ordinary users
const WIKT_BATCH = 50;

// the fetched wikitext, cached across runs (the fetch is the slow part);
// a Map serialized as [word, text|null] pairs
async function loadWikt(pages) {
  const file = path.join(CACHE, 'wiktionary.json');
  const cached = existsSync(file)
    ? new Map(JSON.parse(await readFile(file, 'utf8')))
    : new Map();
  const need = pages.filter((w) => !cached.has(w));
  for (let i = 0; i < need.length; i += WIKT_BATCH) {
    const batch = need.slice(i, i + WIKT_BATCH);
    const url =
      'https://ru.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
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
    process.stderr.write(`wiktionary ${Math.min(i + WIKT_BATCH, need.length)}/${need.length}\n`);
    await new Promise((r) => setTimeout(r, 150));
  }
  await writeFile(file, JSON.stringify([...cached]), 'utf8');
  return cached;
}

// The {{-en-}} section of the page, or null when the entry is not an English
// word. The section runs to the next language header («= {{-xx-}} =»).
function enSection(wikitext) {
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

// Russian words from the section's noun «Значение» lists. A language section
// repeats per part of speech: a «=== Морфологические …» block, then semantics
// with the numbered definitions. A block is the noun's when its head names a
// noun template ({{сущ en}}, {{wdl-en-noun}}, …); the definition lines are
// the Russian equivalents themselves — the wikilinks in them. Function words
// leak in as links of definition phrases («распределение [[по]] зонам») and
// are never a noun's translation — dropped by the stoplist.
const NOT_TRANSLATIONS = new Set([
  'и', 'в', 'во', 'не', 'ни', 'на', 'с', 'со', 'по', 'из', 'за', 'к', 'ко',
  'у', 'о', 'об', 'от', 'до', 'для', 'при', 'про', 'под', 'над', 'без', 'вне',
  'через', 'что', 'чтобы', 'как', 'же', 'бы', 'ли', 'или', 'но', 'а', 'то',
  'всё', 'все', 'этот', 'эта', 'эти', 'тот', 'та', 'те', 'свой', 'своя',
  'свои', 'который', 'которая', 'которое', 'которые', 'его', 'её', 'их',
  'один', 'одна', 'одно', 'два', 'две',
]);

function wiktRu(section) {
  const ru = [];
  const nounHead = /сущ en|wdl-en-noun|en-noun|существительное/;
  const take = (raw) => {
    // links carry the target's language anchor ([[анемия#Русский|анемия]])
    const word = raw.replace(/\u0301/g, '').split('#')[0].trim().toLowerCase();
    if (/^[а-яё][а-яё -]{0,24}$/.test(word) && !NOT_TRANSLATIONS.has(word) && !ru.includes(word))
      ru.push(word);
  };
  for (const chunk of section.split(/=== *Морфологические/).slice(1)) {
    const cut = chunk.indexOf('====');
    const head = chunk.slice(0, cut === -1 ? chunk.length : cut);
    if (!nounHead.test(head)) continue;
    for (const def of chunk.matchAll(/^#(?!#)\s*(.+)$/gm))
      for (const link of def[1].matchAll(/\[\[([^\]|]+)/g)) take(link[1]);
    // stub entries define the word as a bare wikilink line, no list marker
    for (const bare of chunk.matchAll(/^[ \t]*\[\[([^\]|]+)(?:\|[^\]]*)?\]\][ \t]*$/gm))
      take(bare[1]);
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

  // the wiktionary is fetched only for the gaps: words without a translation
  // (either source) or without a transcription (ipa-dict); its pages can mend
  // both — translations from the noun senses, IPA from {{transcriptions}}
  const need = dict.filter((w) => !openRussian.has(w) || !ipa.has(w));
  const pages = await loadWikt(need);

  const entries = new Map();
  for (const word of dict) {
    const ru = [...(openRussian.get(word) ?? [])];
    const hasRu = ru.length > 0;
    let transcription = ipa.get(word) ?? '';
    if (!hasRu || !transcription) {
      const text = pages.get(word);
      if (text) {
        const section = enSection(text);
        if (section) {
          if (!hasRu) for (const w of wiktRu(section)) if (!ru.includes(w)) ru.push(w);
          if (!transcription) transcription = wiktIpa(section);
        }
      }
    }
    if (ru.length > MAX_RU) ru.length = MAX_RU;
    if (ru.length || transcription) entries.set(word, transcription + '|' + ru.join(','));
  }

  const withRu = [...entries.values()].filter((v) => v.slice(v.indexOf('|') + 1)).length;
  const withIpa = [...entries.values()].filter((v) => v.indexOf('|') > 0).length;
  process.stderr.write(
    `words: ${dict.length}; translated: ${withRu}; transcribed: ${withIpa}\n`,
  );

  const header = `// Russian translations and IPA transcriptions of the English game
// dictionary's words, for the word popup (WordPopup.tsx — an English word
// tapped in a score list or the status line). Generated by
// scripts/translate-en.mjs; regenerate with \`node scripts/translate-en.mjs\`
// after changing the English dictionary. Sources, per field:
//  - IPA: ipa-dict en_US (MIT, https://github.com/open-dict-data/ipa-dict),
//    the gap filled from the Russian Wiktionary's {{transcriptions}};
//  - translation: OpenRussian nouns reversed by their English glosses
//    (CC-BY-SA 4.0, https://github.com/Badestrand/russian-dictionary), the
//    gap filled from the Russian Wiktionary entries of the English words —
//    the noun senses' «Значение» lines (ru.wiktionary.org, CC-BY-SA).
// Both Russian sources describe noun senses, matching the English
// dictionary's nouns-only filter. A value is "ipa|ru,ru" (either side may be
// empty); only words with at least one of the two are listed.
`;
  const body = `
export interface Translation {
  ipa: string; // '' when no source had the word
  ru: string[];
}

export const EN_RU: Record<string, string> = ${JSON.stringify(Object.fromEntries(entries))};

const cache = new Map<string, Translation>();

export function translateEn(word: string): Translation | null {
  const value = EN_RU[word];
  if (value === undefined) return null;
  let t = cache.get(word);
  if (t === undefined) {
    const bar = value.indexOf('|');
    t = { ipa: value.slice(0, bar), ru: value.slice(bar + 1).split(',').filter(Boolean) };
    cache.set(word, t);
  }
  return t;
}
`;
  await writeFile(OUT, header + body, 'utf8');
  process.stderr.write(`written ${OUT}\n`);
}

main();
