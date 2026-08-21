// Score columns: points and word lists for the player and the computer.
function score(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

interface ScorePanelProps {
  playerWords: string[];
  botWords: string[];
}

export function ScorePanel({ playerWords, botWords }: ScorePanelProps) {
  return (
    <div className="score-panel">
      <div className="column-left">
        <strong>Игрок: {score(playerWords)}</strong>
        <div className="words">
          {playerWords.map((word, i) => (
            <div key={i}>{word} ({word.length})</div>
          ))}
        </div>
      </div>
      <div className="column-right">
        <strong>Компьютер: {score(botWords)}</strong>
        <div className="words">
          {botWords.map((word, i) => (
            <div key={i}>{word} ({word.length})</div>
          ))}
        </div>
      </div>
    </div>
  );
}
