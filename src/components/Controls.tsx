// Control buttons: a single row — the demoted «Заново» on the left, «Отмена»
// (while a move is being made: the letter or the word phase) on the right,
// so the restart button never moves when the phases change. The word itself
// is submitted by the drag release, so there is no «Готово» button. The
// restart wipes the whole game, so it is small, visually secondary and needs
// a second confirming tap: the first tap arms it («Точно?»/«Sure?») for a few
// seconds, only then it restarts. All labels come from i18n (texts.controls).
import { useEffect, useState } from 'react';
import type { Texts } from '../i18n';
import type { Phase } from '../state/types';

interface ControlsProps {
  phase: Phase;
  texts: Texts;
  onRestart: () => void;
  onCancel: () => void;
}

// how long the restart confirmation stays armed without the second tap
const RESTART_ARM_MS = 3000;

export function Controls({ phase, texts, onRestart, onCancel }: ControlsProps) {
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
  return (
    <div className="controls">
      <div className="controls-row">
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
        {(phase === 'letter' || phase === 'word') && (
          <button type="button" id="cancel" className="btn-secondary" onClick={onCancel}>
            {c.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
