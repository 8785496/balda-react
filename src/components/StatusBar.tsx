// Status line: the word being built (the original's #result) and #error,
// the computer's turn status, plus a permanent whose-turn badge.
// Validation errors render as a tinted chip with a warning icon (role=alert);
// the line reserves its height whether or not an error is shown.
import type { Phase } from '../state/types';

interface StatusBarProps {
  result: string;
  error: string;
  status: string;
  phase: Phase;
}

export function StatusBar({ result, error, status, phase }: StatusBarProps) {
  const botThinking = phase === 'bot';
  return (
    <div className="status-bar">
      <div className="status-row">
        {phase !== 'over' && (
          <div className={'turn ' + (botThinking ? 'turn-bot' : 'turn-player')}>
            {botThinking ? 'Ход: компьютер' : 'Ход: игрок'}
          </div>
        )}
        <div className="result">
          {botThinking ? 'Компьютер думает…' : (status || result)}
        </div>
      </div>
      <div
        className={error ? 'error show' : 'error'}
        role={error ? 'alert' : undefined}
      >
        {error && (
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
        {error}
      </div>
    </div>
  );
}
