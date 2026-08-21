// Кнопки управления: Старт/Заново, Ход, Отмена.
// «Ход» активен в те же моменты, что и validate оригинала (после старта,
// вне хода компьютера и не после конца партии), «Отмена» — только пока
// идёт выбор буквы или построение пути.
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
