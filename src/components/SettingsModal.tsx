// The settings sheet, opened by the footer's gear: the board color theme as
// a row of swatch cards (the theme picker's only home now). Closes on the ✕
// button, a click on the backdrop or Escape (App.tsx).
import type { ThemeId } from '../theme';
import type { Texts } from '../i18n';
import { ThemePicker } from './ThemePicker';

interface SettingsModalProps {
  theme: ThemeId;
  texts: Texts;
  onChange: (id: ThemeId) => void;
  onClose: () => void;
}

export function SettingsModal({ theme, texts, onChange, onClose }: SettingsModalProps) {
  const t = texts.settings;
  return (
    <div className="substrate" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t.title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t.close}
            autoFocus
          >
            ✕
          </button>
        </div>
        <p className="modal-label">{texts.themeAria}</p>
        <ThemePicker value={theme} texts={texts} onChange={onChange} />
      </div>
    </div>
  );
}
