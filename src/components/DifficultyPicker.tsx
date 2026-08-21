// Bot difficulty switcher (easy | medium | hard). Only changes which of the
// found moves the computer plays, so it applies from its next turn — no
// restart, no confirmation needed.
import { DIFFICULTIES, type Difficulty } from '../difficulty';
import type { Texts } from '../i18n';

interface DifficultyPickerProps {
  value: Difficulty;
  texts: Texts;
  onChange: (d: Difficulty) => void;
}

export function DifficultyPicker({ value, texts, onChange }: DifficultyPickerProps) {
  return (
    <div className="seg" role="group" aria-label={texts.difficultyAria}>
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          type="button"
          className={'seg-btn' + (d === value ? ' active' : '')}
          aria-pressed={d === value}
          onClick={() => onChange(d)}
        >
          {texts.difficultyName(d)}
        </button>
      ))}
    </div>
  );
}
