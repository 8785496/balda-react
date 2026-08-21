// Виртуальная клавиатура с оверлеем (аналог #substrate/#keyboard оригинала).
import { ALPHABET } from '../game/constants';

interface KeyboardProps {
  onLetter: (char: string) => void;
  onCancel: () => void;
}

export function Keyboard({ onLetter, onCancel }: KeyboardProps) {
  return (
    <div className="substrate" onClick={onCancel}>
      <div
        className="keyboard"
        onClick={(e) => {
          // клик по панели не закрывает клавиатуру
          e.stopPropagation();
        }}
        role="group"
        aria-label="Виртуальная клавиатура"
      >
        {ALPHABET.split('').map((char) => (
          <button key={char} type="button" onClick={() => onLetter(char)}>
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
