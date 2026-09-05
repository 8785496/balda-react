// The new-game sheet, opened by the footer's plus button: the game language
// and the bot difficulty, and the start button under them. The language is
// a plain selection until the button applies it (and restarts the game);
// the difficulty applies at once — it only steers the computer's next move,
// no restart needed, so it survives closing the sheet without starting.
// Over a game in progress the start button arms first («Точно?», 3 s) — the
// same two-tap confirmation as «Заново». Closes on the ✕ button, a click on
// the backdrop or Escape (App.tsx).
import { useEffect, useState } from 'react';
import type { Lang } from '../game/lang';
import type { Difficulty } from '../difficulty';
import { LANGS } from '../lang';
import type { Texts } from '../i18n';
import { DifficultyPicker } from './DifficultyPicker';

// how long the start confirmation stays armed without the second tap
const ARM_MS = 3000;

interface NewGameModalProps {
  lang: Lang; // the current game's language — the selection starts from it
  difficulty: Difficulty;
  hasProgress: boolean; // any words played beyond the starting one
  texts: Texts;
  onDifficulty: (d: Difficulty) => void;
  onStart: (lang: Lang) => void;
  onClose: () => void;
}

export function NewGameModal({
  lang,
  difficulty,
  hasProgress,
  texts,
  onDifficulty,
  onStart,
  onClose,
}: NewGameModalProps) {
  const t = texts.newGame;
  // the language of the game the button will start; the component remounts
  // on every open, so a closed sheet never keeps a half-made choice
  const [sel, setSel] = useState<Lang>(lang);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed)
      return;
    const timer = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function start() {
    if (hasProgress && !armed) {
      setArmed(true);
      return;
    }
    onStart(sel);
  }

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
        <p className="modal-label">{t.lang}</p>
        <div className="seg" role="group" aria-label={texts.langAria}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={'seg-btn' + (l.id === sel ? ' active' : '')}
              aria-pressed={l.id === sel}
              onClick={() => setSel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="modal-label">{t.difficulty}</p>
        <DifficultyPicker value={difficulty} texts={texts} onChange={onDifficulty} />
        <button
          type="button"
          className={'newgame-start' + (armed ? ' armed' : '')}
          onClick={start}
        >
          {armed ? texts.controls.confirm : t.start}
        </button>
      </div>
    </div>
  );
}
