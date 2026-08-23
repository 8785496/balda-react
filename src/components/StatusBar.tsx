// Status line: the word being built (the original's #result) and the
// computer's move report, plus a permanent turn badge that flips to
// «Думаю…» for the computer's turn (the line itself is empty then — the
// word being built is gone and the move has not arrived yet).
// The computer's played word renders as label + word + points, where the word
// and its points are set off by style (.status-word/.word-len) instead of
// quotes and parentheses; the word is an outbound link (wordUrl from
// ScorePanel — the same place the score-list words point to). Validation
// errors render as a toast: a warning-icon pill (role=alert) fixed to the
// top of the screen, hidden again after a few seconds — it takes no
// layout space, so the status bar is a single row and the board sits right
// under it (styles/index.css).
import { useEffect, useState, type ReactNode } from 'react';
import type { Texts } from '../i18n';
import type { Lang } from '../game/lang';
import type { GameError, Phase, Status } from '../state/types';
import { wordUrl } from './ScorePanel';

// how long the error toast stays on screen before hiding itself
const ERROR_TOAST_MS = 3000;

interface StatusBarProps {
  result: string;
  error: GameError | null;
  status: Status | null;
  phase: Phase;
  lang: Lang; // the game's language — decides where the bot's word links to
  texts: Texts;
}

export function StatusBar({ result, error, status, phase, lang, texts }: StatusBarProps) {
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
    ) : (
      texts.statusBotSkip
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
