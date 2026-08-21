// Control buttons: Заново, Готово, ⌫, Отмена.
// «Готово» (the original's validate) is enabled only while a word path is
// being built, so pressing it can no longer produce the "no word yet"
// errors; «⌫» removes the last path cell and, once the path is empty,
// reopens the letter keyboard; «Отмена» shows only in the word phase — in
// the letter phase the keyboard overlay covers the page, and cancel works
// via the overlay click or Escape.
import type { Phase } from '../state/types';

interface ControlsProps {
  phase: Phase;
  canSubmit: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function Controls({ phase, canSubmit, onRestart, onSubmit, onBack, onCancel }: ControlsProps) {
  return (
    <div className="controls">
      <button type="button" id="start" onClick={onRestart}>
        Заново
      </button>
      <button type="button" id="test" onClick={onSubmit} disabled={!canSubmit}>
        Готово
      </button>
      {phase === 'word' && (
        <>
          <button
            type="button"
            id="back"
            onClick={onBack}
            title="Убрать последнюю букву пути; с пустым путём — сменить добавленную букву"
            aria-label="Убрать последнюю букву пути"
          >
            ⌫
          </button>
          <button type="button" id="cancel" onClick={onCancel}>
            Отмена
          </button>
        </>
      )}
    </div>
  );
}
