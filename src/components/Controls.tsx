// Control buttons: cancel, the submit, ⌫, and a demoted restart — the word
// phase's main row is «Отмена» — «Готово» — «⌫».
// The submit button (the original's validate) is the single large primary
// action and is enabled only while a word path is being built, so pressing it
// can no longer produce the "no word yet" errors; until a letter is chosen it
// names the missing step («Добавьте букву») instead of «Готово»; «⌫» removes
// the last path cell and, once the path is empty, reopens the letter
// keyboard; the cancel shows only in the word phase — in the letter phase it
// lives on the keyboard panel. The restart wipes the whole game, so it is small, visually
// secondary, sits on a row of its own away from the submit, and needs a
// second confirming tap: the first tap arms it («Точно?»/«Sure?») for a few
// seconds, only then it restarts. All labels come from i18n (texts.controls).
import { useEffect, useState } from 'react';
import type { Texts } from '../i18n';
import type { Phase } from '../state/types';

interface ControlsProps {
  phase: Phase;
  canSubmit: boolean;
  texts: Texts;
  onRestart: () => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

// how long the restart confirmation stays armed without the second tap
const RESTART_ARM_MS = 3000;

export function Controls({ phase, canSubmit, texts, onRestart, onSubmit, onBack, onCancel }: ControlsProps) {
  const [armed, setArmed] = useState(false);

  // any phase change (the restart itself included) disarms the confirmation
  useEffect(() => {
    setArmed(false);
  }, [phase]);

  useEffect(() => {
    if (!armed)
      return;
    const timer = setTimeout(() => setArmed(false), RESTART_ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const c = texts.controls;
  // until a letter is chosen the primary button names the missing step
  const submitLabel = phase === 'idle' || phase === 'letter' ? c.addLetter : c.submit;
  return (
    <div className="controls">
      <div className="controls-main">
        {phase === 'word' && (
          <button type="button" id="cancel" className="btn-secondary" onClick={onCancel}>
            {c.cancel}
          </button>
        )}
        <button
          type="button"
          id="test"
          className="btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {submitLabel}
        </button>
        {phase === 'word' && (
          <button
            type="button"
            id="back"
            onClick={onBack}
            title={c.backTitle}
            aria-label={c.backLabel}
          >
            <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" aria-hidden="true" focusable="false">
              <path
                d="M8 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-6-7 6-7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 9.5l5 5m0-5l-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="controls-restart">
        <button
          type="button"
          id="start"
          className={'btn-secondary btn-restart' + (armed ? ' armed' : '')}
          onClick={() => {
            if (armed) {
              setArmed(false);
              onRestart();
            } else {
              setArmed(true);
            }
          }}
          title={armed ? c.restartArmedTitle : c.restartTitle}
        >
          {armed ? c.confirm : c.restart}
        </button>
      </div>
    </div>
  );
}
