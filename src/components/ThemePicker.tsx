// Swatch row for switching the board color theme (palettes in index.css).
import { THEMES, type ThemeId } from '../theme';

interface ThemePickerProps {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-row" role="group" aria-label="Оформление поля">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === value ? 'theme-swatch active' : 'theme-swatch'}
          style={{ backgroundColor: t.swatch }}
          title={t.name}
          aria-label={t.name}
          aria-pressed={t.id === value}
          onClick={() => onChange(t.id)}
        />
      ))}
    </div>
  );
}
