// Board color themes. The palettes live in index.css as [data-theme='…']
// blocks; this module knows the ids and swatch colors for the picker, plus
// localStorage persistence. The display names are per-language (i18n.ts).

// `chrome` is the color of the browser/OS chrome above the page — the status
// bar of the installed standalone app on Android, the tab bar on desktop. It
// is the top edge of the theme's --page-bg (gradients flattened to their
// top color), so the bar reads as the page continuing behind it.
export const THEMES = [
  { id: 'wood', swatch: '#a9713d', chrome: '#e7d9bd' },
  { id: 'night', swatch: '#262e3a', chrome: '#171b22' },
  { id: 'neon', swatch: '#7c3aed', chrome: '#2a1a5e' },
  { id: 'paper', swatch: '#ffffff', chrome: '#ffffff' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

// applied when the player has no saved choice
export const DEFAULT_THEME: ThemeId = 'neon';

// meta theme-color of index.html — the pre-JS value, also the fallback here
const CHROME_AT_LAUNCH = '#8a5a2b';

// the chrome color for a theme id; index.html ships the static launch color
// (wood, matching the splash) and App re-points the tag at the active theme
export function chromeColorFor(id: ThemeId): string {
  return THEMES.find((t) => t.id === id)?.chrome ?? CHROME_AT_LAUNCH;
}

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
