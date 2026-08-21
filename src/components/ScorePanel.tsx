// Score columns: points and word lists for the player and the computer,
// with the game progress counter above them.
import type { Texts } from '../i18n';

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
  texts: Texts;
}

export function ScorePanel({ playerWords, botWords, usedCount, maxWords, texts }: ScorePanelProps) {
  return (
    <div className="score-panel">
      <div className="words-progress">{texts.score.progress(usedCount, maxWords)}</div>
      <div className="score-columns">
        <div className="column-left">
          <strong>{texts.score.player}: {score(playerWords)}</strong>
          <div className="words">
            {playerWords.map((word, i) => (
              <div key={i}>{word} ({word.length})</div>
            ))}
          </div>
        </div>
        <div className="column-right">
          <strong>{texts.score.computer}: {score(botWords)}</strong>
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
