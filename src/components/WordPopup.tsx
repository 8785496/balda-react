// The word popup: an English word tapped in a score list or in the status
// line opens its quick reference here instead of following a link — the IPA
// transcription and the Russian translations from the bundled data
// (game/translate-en.ts), with the same outbound Yandex Translate link the
// words used to follow directly at the bottom (wordUrl). The game's English
// words are nouns, so the marker beside the word reads noun — unless only
// another sense translated it (adjective, verb, adverb), which the data
// records per word. Closes on the ✕ button, a click on the backdrop or
// Escape (App.tsx). Russian words stay plain links (gramota.ru).
import { translateEn } from '../game/translate-en';
import { wordUrl } from './ScorePanel';
import type { Texts } from '../i18n';

interface WordPopupProps {
  word: string; // an English dictionary word
  texts: Texts;
  onClose: () => void;
}

export function WordPopup({ word, texts, onClose }: WordPopupProps) {
  const t = translateEn(word);
  return (
    <div className="substrate" onClick={onClose}>
      <div
        className="word-card"
        role="dialog"
        aria-modal="true"
        aria-label={word}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="word-head">
          <h2 className="word-title">{word}</h2>
          <span className="word-pos">{texts.word.pos[t === null ? 'noun' : t.pos]}</span>
          <button
            type="button"
            className="word-close"
            onClick={onClose}
            aria-label={texts.word.close}
            autoFocus
          >
            ✕
          </button>
        </div>
        {t !== null && t.ipa !== '' && <div className="word-ipa">/{t.ipa}/</div>}
        {t !== null && t.ru.length > 0 ? (
          <div className="word-ru">
            {t.ru.map((ru) => (
              <span key={ru}>{ru}</span>
            ))}
          </div>
        ) : (
          <div className="word-none">{texts.word.noTranslation}</div>
        )}
        <a className="word-dict" href={wordUrl('en', word)} target="_blank" rel="noopener noreferrer">
          {texts.word.yandex}
        </a>
      </div>
    </div>
  );
}
