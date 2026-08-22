// Status line: the word being built (the original's #result) and the error,
// the computer's turn status, plus a permanent whose-turn badge.
// The computer's played word renders as label + word + points, where the word
// and its points are set off by style (.status-word/.word-len) instead of
// quotes and parentheses; the word is an outbound link (wordUrl from
// ScorePanel — the same place the score-list words point to). Validation
// errors render as a tinted chip with a warning icon (role=alert); the chip is
// absolutely positioned in a reserved slot under the word row, so it never
// reflows the layout below (styles/index.css).
import type { ReactNode } from 'react';
import type { Texts } from '../i18n';
import type { Lang } from '../game/lang';
import type { GameError, Phase, Status } from '../state/types';
import { wordUrl } from './ScorePanel';

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
  let line: ReactNode = result;
  if (botThinking)
    line = texts.botThinking;
  else if (status !== null)
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
          <div className={'turn ' + (botThinking ? 'turn-bot' : 'turn-player')}>
            {botThinking ? texts.turnBot : texts.turnPlayer}
          </div>
        )}
        <div className="result">{line}</div>
      </div>
      <div
        className={error !== null ? 'error show' : 'error'}
        role={error !== null ? 'alert' : undefined}
      >
        {error !== null && (
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
        )}
        {error !== null ? texts.error(error) : ''}
      </div>
    </div>
  );
}
