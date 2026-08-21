// Board color themes. The palettes themselves live in index.css as
// [data-theme='…'] blocks; this module only knows the ids, Russian display
// names and swatch colors for the picker, plus localStorage persistence.

export const THEMES = [
  { id: 'wood', name: 'Дерево', swatch: '#a9713d' },
  { id: 'paper', name: 'Бумага', swatch: '#ffffff' },
  { id: 'night', name: 'Ночь', swatch: '#262e3a' },
  { id: 'neon', name: 'Неон', swatch: '#7c3aed' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

// applied when the player has no saved choice
export const DEFAULT_THEME: ThemeId = 'neon';

const STORAGE_KEY = 'balda-theme';

export function loadTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored))
      return stored as ThemeId;
  } catch {
    // localStorage may be unavailable — keep the default
  }
  return DEFAULT_THEME;
}

export function saveTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore write failures
  }
}
