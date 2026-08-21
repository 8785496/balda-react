// Swatch row for switching the board color theme (palettes in index.css).
// The swatch names are localized — they come with texts.
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
          className={t.id === value ? 'theme-swatch active' : 'theme-swatch'}
          style={{ backgroundColor: t.swatch }}
          title={texts.themeNames[t.id]}
          aria-label={texts.themeNames[t.id]}
          aria-pressed={t.id === value}
          onClick={() => onChange(t.id)}
        />
      ))}
    </div>
  );
}
