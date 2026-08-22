// Status line: the word being built (the original's #result) and the error,
// the computer's turn status, plus a permanent whose-turn badge.
// Validation errors render as a tinted chip with a warning icon (role=alert);
// the chip is absolutely positioned in a reserved slot under the word row, so
// it never reflows the layout below (styles/index.css).
import type { Texts } from '../i18n';
import type { GameError, Phase, Status } from '../state/types';

interface StatusBarProps {
  result: string;
  error: GameError | null;
  status: Status | null;
  phase: Phase;
  texts: Texts;
}

export function StatusBar({ result, error, status, phase, texts }: StatusBarProps) {
  const botThinking = phase === 'bot';
  return (
    <div className="status-bar">
      <div className="status-row">
        {phase !== 'over' && (
          <div className={'turn ' + (botThinking ? 'turn-bot' : 'turn-player')}>
            {botThinking ? texts.turnBot : texts.turnPlayer}
          </div>
        )}
        <div className="result">
          {botThinking ? texts.botThinking : (status !== null ? texts.status(status) : result)}
        </div>
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
