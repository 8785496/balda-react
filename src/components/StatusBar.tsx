// Status line: the word being built (the original's #result) and the
// computer's move report, plus a permanent turn badge that flips to
// «Думаю…» for the computer's turn (the line itself is empty then — the
// word being built is gone and the move has not arrived yet).
// The computer's played word renders as label + word + points, where the word
// and its points are set off by style (.status-word/.word-len) instead of
// quotes and parentheses; the word is tappable like the score-list words —
// a russian word follows the outbound link (wordUrl from ScorePanel), an
// english one opens the translation popup (onWordClick → WordPopup) and is
// followed by its IPA transcription (WordIpa), as in the score lists.
// While no word has been played yet, the same line shows the starting word
// itself, tappable the same way: on the board it is just letters, and no
// score column owns it — this is its only lookup/translation entry point.
// In the english game the word is followed by its IPA transcription
// (WordIpa from ScorePanel), like the score-list words. The cancel link of
// a move in progress floats at the same row's right edge — plain red bold
// text like any link, out of the row's flow, so its appearing and leaving
// never move the badge or the word (the old controls-row «Отмена»): it shows
// only while a move is being made (the letter/word phases) and dispatches
// CANCEL_MOVE.
// Validation
// errors render as a toast: a warning-icon pill (role=alert) fixed to the
// top of the screen, hidden again after a few seconds — it takes no
// layout space, so the status bar is a single row and the board sits right
// under it (styles/index.css).
import { useEffect, useState, type ReactNode } from 'react';
import type { Texts } from '../i18n';
import type { Lang } from '../game/lang';
import type { GameError, Phase, Status } from '../state/types';
import { wordUrl, WordIpa } from './ScorePanel';

// how long the error toast stays on screen before hiding itself
const ERROR_TOAST_MS = 3000;

interface StatusBarProps {
  result: string;
  // the starting word, shown in the otherwise-empty line until the first
  // move; null once any word has been played
  startWord: string | null;
  error: GameError | null;
  status: Status | null;
  phase: Phase;
  lang: Lang; // the game's language — decides where the bot's word leads
  texts: Texts;
  // an english bot word opens its translation popup; russian words never call it
  onWordClick: (word: string) => void;
  // the status row's floating cancel link: rolls a move in progress back
  // (CANCEL_MOVE); positioned absolutely, it takes no layout space
  onCancel: () => void;
}

export function StatusBar({ result, startWord, error, status, phase, lang, texts, onWordClick, onCancel }: StatusBarProps) {
  const botThinking = phase === 'bot';
  // the toast hides itself after a few seconds even though the error stays in
  // the game state until the player's next action clears it; every failed
  // submit makes a fresh error object, so the effect re-runs and the toast
  // shows again
  const [toastShown, setToastShown] = useState(false);
  useEffect(() => {
    if (error === null)
      return;
    setToastShown(true);
    const timer = setTimeout(() => setToastShown(false), ERROR_TOAST_MS);
    return () => clearTimeout(timer);
  }, [error]);
  let line: ReactNode = result;
  if (status !== null)
    line = status.kind === 'botMove' ? (
      <>
        {texts.statusBotMove}{' '}
        {lang === 'en' ? (
          <>
            <button type="button" className="status-word" onClick={() => onWordClick(status.word)}>
              {status.word}
            </button>
            {/* the transcription and the points as one non-breaking group:
                a too-narrow line wraps between the word and its metadata,
                not before the "+n" (see .word-meta in styles) */}
            <span className="word-meta">
              <WordIpa word={status.word} />
              <span className="word-len">+{status.word.length}</span>
            </span>
          </>
        ) : (
          <>
            <a
              className="status-word"
              href={wordUrl(lang, status.word)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {status.word}
            </a>
            <span className="word-len">+{status.word.length}</span>
          </>
        )}
      </>
    ) : (
      texts.statusBotSkip
    );
  else if (result === '' && startWord !== null)
    // the game has not moved yet and nothing is being drawn: the starting
    // word takes the line — tappable like every played word (the same
    // english/russian split as the bot's word above, but neutral styling:
    // the word belongs to neither side)
    line =
      lang === 'en' ? (
        <>
          <button type="button" className="status-start" onClick={() => onWordClick(startWord)}>
            {startWord}
          </button>
          <WordIpa word={startWord} />
        </>
      ) : (
        <a
          className="status-start"
          href={wordUrl(lang, startWord)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {startWord}
        </a>
      );
  return (
    <div className="status-bar">
      <div className="status-row">
        {phase !== 'over' && (
          /* both labels are rendered, stacked in one grid cell — the badge's
             width is always the wider label's, so nothing shifts on the flip */
          <div className={'turn ' + (botThinking ? 'turn-bot' : 'turn-player')}>
            <span className={botThinking ? 'turn-alt' : ''}>{texts.turnPlayer}</span>
            <span className={botThinking ? '' : 'turn-alt'}>{texts.botThinking}</span>
          </div>
        )}
        <div className="result">{line}</div>
        {(phase === 'letter' || phase === 'word') && (
          <a
            className="btn-cancel"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
            title={texts.controls.cancelTitle}
            aria-label={texts.controls.cancelTitle}
          >
            {texts.controls.cancel}
          </a>
        )}
      </div>
      {error !== null && toastShown && (
        <div className="error show" role="alert">
          <svg
            className="error-icon"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 3.5 22 20H2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M12 9.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17.3" r="1.3" fill="currentColor" />
          </svg>
          {texts.error(error)}
        </div>
      )}
    </div>
  );
}
