// Virtual keyboard with an overlay (the analog of the original's #substrate/#keyboard).
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
          // a click on the panel itself does not close the keyboard
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
