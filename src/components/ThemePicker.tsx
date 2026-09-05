// Swatch cards for switching the board color theme (palettes in index.css),
// living in the settings modal: each card is the theme's swatch over its
// localized name, the active theme outlined. The names come with texts.
import { THEMES, type ThemeId } from '../theme';
import type { Texts } from '../i18n';

interface ThemePickerProps {
  value: ThemeId;
  texts: Texts;
  onChange: (id: ThemeId) => void;
}

export function ThemePicker({ value, texts, onChange }: ThemePickerProps) {
  return (
    <div className="theme-row" role="group" aria-label={texts.themeAria}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === value ? 'theme-card active' : 'theme-card'}
          aria-pressed={t.id === value}
          onClick={() => onChange(t.id)}
        >
          <span className="theme-swatch" style={{ backgroundColor: t.swatch }} aria-hidden="true" />
          <span className="theme-name">{texts.themeNames[t.id]}</span>
        </button>
      ))}
    </div>
  );
}
