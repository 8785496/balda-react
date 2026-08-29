// End-of-game panel over the board — instead of the original's alert().
// The score line reuses the column-header chips (ScorePanel's .score-num):
// each side's points in its color, a muted dash between — no colons.
// The quiet ✕ dismisses the panel (the finished game stays on the board;
// the controls row's «Заново» restarts) — the same way out as the rules
// modal's.
import type { Texts } from '../i18n';

interface EndPanelProps {
  playerScore: number;
  botScore: number;
  texts: Texts;
  onRestart: () => void;
  onClose: () => void;
}

export function EndPanel({ playerScore, botScore, texts, onRestart, onClose }: EndPanelProps) {
  const e = texts.end;
  let title: string;
  if (playerScore === botScore)
    title = e.draw;
  else if (playerScore > botScore)
    title = e.win;
  else
    title = e.lose;
  return (
    <div className="end-panel substrate">
      <div className="end-card">
        <div className="end-head">
          <h2>{title}</h2>
          <button type="button" className="end-close" onClick={onClose} aria-label={e.close}>
            ✕
          </button>
        </div>
        <p>
          <span className="score-name">{e.score}</span>
          <span className="score-num">{playerScore}</span>
          <span className="end-score-sep">–</span>
          <span className="score-num bot">{botScore}</span>
        </p>
        <button type="button" onClick={onRestart}>
          {e.restart}
        </button>
      </div>
    </div>
  );
}
