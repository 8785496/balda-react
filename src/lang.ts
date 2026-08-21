// Game language switcher state: ids and labels for the footer control, plus
// localStorage persistence. The per-language game config (alphabet, starting
// word, dictionary) lives in game/lang.ts; switching restarts the game.
import type { Lang } from './game/lang';

export const LANGS = [
  { id: 'ru' as const, label: 'RUS' },
  { id: 'en' as const, label: 'ENG' },
];

// applied when the player has no saved choice
export const DEFAULT_LANG: Lang = 'ru';

const STORAGE_KEY = 'balda-lang';

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGS.some((l) => l.id === stored))
      return stored as Lang;
  } catch {
    // localStorage may be unavailable — keep the default
  }
  return DEFAULT_LANG;
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore write failures
  }
}
