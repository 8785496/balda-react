// End-of-game panel over the board — instead of the original's alert().
interface EndPanelProps {
  playerScore: number;
  botScore: number;
  onRestart: () => void;
}

export function EndPanel({ playerScore, botScore, onRestart }: EndPanelProps) {
  let title: string;
  if (playerScore === botScore)
    title = 'Ничья';
  else if (playerScore > botScore)
    title = 'Вы победили :)';
  else
    title = 'Вы проиграли :(';
  return (
    <div className="end-panel substrate">
      <div className="end-card">
        <h2>{title}</h2>
        <p>Счёт: {playerScore} : {botScore}</p>
        <button type="button" onClick={onRestart}>
          Заново
        </button>
      </div>
    </div>
  );
}
