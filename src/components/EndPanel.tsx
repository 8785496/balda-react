// End-of-game panel over the board — instead of the original's alert().
import type { Texts } from '../i18n';

interface EndPanelProps {
  playerScore: number;
  botScore: number;
  texts: Texts;
  onRestart: () => void;
}

export function EndPanel({ playerScore, botScore, texts, onRestart }: EndPanelProps) {
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
        <h2>{title}</h2>
        <p>{e.score}: {playerScore} : {botScore}</p>
        <button type="button" onClick={onRestart}>
          {e.restart}
        </button>
      </div>
    </div>
  );
}
