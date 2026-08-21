// Control buttons: Готово, ⌫, Отмена, and a demoted Заново.
// «Готово» (the original's validate) is the single large primary action and is
// enabled only while a word path is being built, so pressing it can no longer
// produce the "no word yet" errors; «⌫» removes the last path cell and, once
// the path is empty, reopens the letter keyboard; «Отмена» shows only in the
// word phase — in the letter phase it lives on the keyboard panel.
// «Заново» wipes the whole game, so it is small, visually secondary, sits on
// a row of its own away from «Готово», and needs a second confirming tap:
// the first tap arms it («Точно?») for a few seconds, only then it restarts.
import { useEffect, useState } from 'react';
import type { Phase } from '../state/types';

interface ControlsProps {
  phase: Phase;
  canSubmit: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

// how long the restart confirmation stays armed without the second tap
const RESTART_ARM_MS = 3000;

export function Controls({ phase, canSubmit, onRestart, onSubmit, onBack, onCancel }: ControlsProps) {
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

  return (
    <div className="controls">
      <div className="controls-main">
        {phase === 'word' && (
          <button
            type="button"
            id="back"
            onClick={onBack}
            title="Убрать последнюю букву пути; с пустым путём — сменить добавленную букву"
            aria-label="Убрать последнюю букву пути"
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
        <button
          type="button"
          id="test"
          className="btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          Готово
        </button>
        {phase === 'word' && (
          <button type="button" id="cancel" className="btn-secondary" onClick={onCancel}>
            Отмена
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
          title={armed ? 'Нажмите ещё раз — игра начнётся заново' : 'Начать игру заново'}
        >
          {armed ? 'Точно?' : 'Заново'}
        </button>
      </div>
    </div>
  );
}
