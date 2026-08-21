// Language switcher (RUS | ENG). Switching the language starts a new game —
// the board, the alphabet, the dictionary and the played words are
// language-bound. When the current game has any progress, the first tap only
// arms the choice («Точно?»), as with «Заново»; a second tap within a few
// seconds applies it. On a fresh game the switch is immediate.
import { useEffect, useState } from 'react';
import type { Lang } from '../game/lang';
import { LANGS } from '../lang';
import type { Texts } from '../i18n';

// how long the switch confirmation stays armed without the second tap
const ARM_MS = 3000;

interface LangPickerProps {
  value: Lang;
  hasProgress: boolean; // any words played beyond the starting one
  texts: Texts;
  onChange: (lang: Lang) => void;
}

export function LangPicker({ value, hasProgress, texts, onChange }: LangPickerProps) {
  const [armed, setArmed] = useState<Lang | null>(null);

  // the applied switch (or an outside change) disarms the confirmation
  useEffect(() => {
    setArmed(null);
  }, [value]);

  useEffect(() => {
    if (armed === null)
      return;
    const timer = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function pick(id: Lang) {
    if (id === value) {
      setArmed(null);
      return;
    }
    if (!hasProgress || armed === id) {
      onChange(id);
      return;
    }
    setArmed(id);
  }

  return (
    <div className="seg" role="group" aria-label={texts.langAria}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={
            'seg-btn' +
            (l.id === value ? ' active' : '') +
            (armed === l.id ? ' armed' : '')
          }
          aria-pressed={l.id === value}
          title={armed === l.id ? texts.controls.restartArmedTitle : undefined}
          onClick={() => pick(l.id)}
        >
          {armed === l.id ? texts.controls.confirm : l.label}
        </button>
      ))}
    </div>
  );
}
