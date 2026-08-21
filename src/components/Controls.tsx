// Control buttons: Старт/Заново, Ход, Отмена.
// «Ход» is active at the same moments as the original's validate (after the
// start, outside the computer's turn and not after the game is over);
// «Отмена» — only while a letter is being chosen or a path is being built.
import type { Phase } from '../state/types';

interface ControlsProps {
  phase: Phase;
  onStart: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function Controls({ phase, onStart, onSubmit, onCancel }: ControlsProps) {
  const started = phase !== 'menu';
  const submitEnabled = started && phase !== 'bot' && phase !== 'over';
  const cancelEnabled = phase === 'letter' || phase === 'word';
  return (
    <div className="controls">
      <button type="button" id="start" onClick={onStart}>
        {started ? 'Заново' : 'Старт'}
      </button>
      <button type="button" id="test" onClick={onSubmit} disabled={!submitEnabled}>
        Ход
      </button>
      <button type="button" id="cancel" onClick={onCancel} disabled={!cancelEnabled}>
        Отмена
      </button>
    </div>
  );
}
