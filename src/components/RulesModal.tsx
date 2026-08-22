// The game rules in a modal, opened by the footer "?" button: a brief
// summary in the current language and, at the end, a link to the Russian
// Wikipedia article (in both game languages). Closes on the ✕ button, a
// click on the backdrop or Escape (App.tsx).
import { RULES_WIKI_URL, type Texts } from '../i18n';

interface RulesModalProps {
  texts: Texts;
  onClose: () => void;
}

export function RulesModal({ texts, onClose }: RulesModalProps) {
  return (
    <div className="substrate" onClick={onClose}>
      <div
        className="rules-card"
        role="dialog"
        aria-modal="true"
        aria-label={texts.rules.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rules-head">
          <h2>{texts.rules.title}</h2>
          <button
            type="button"
            className="rules-close"
            onClick={onClose}
            aria-label={texts.rules.close}
            autoFocus
          >
            ✕
          </button>
        </div>
        <ul className="rules-list">
          {texts.rules.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <a className="rules-link" href={RULES_WIKI_URL} target="_blank" rel="noreferrer">
          {texts.rules.link}
        </a>
      </div>
    </div>
  );
}
