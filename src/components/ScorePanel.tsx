// Score columns: points and word lists for the player and the computer,
// with the game progress counter above them.
function score(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

interface ScorePanelProps {
  playerWords: string[];
  botWords: string[];
  usedCount: number; // words played so far, the starting word included
  maxWords: number;
}

export function ScorePanel({ playerWords, botWords, usedCount, maxWords }: ScorePanelProps) {
  return (
    <div className="score-panel">
      <div className="words-progress">Слово {usedCount} из {maxWords}</div>
      <div className="score-columns">
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
    </div>
  );
}
