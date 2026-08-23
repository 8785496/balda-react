// Score columns: points and word lists for the player and the computer. The
// column headers set the points off by style (.score-num) instead of a
// "Name: 20" colon. The lists render newest first, so the just-played word
// lands on top of its column; the per-word letter count is set off by its
// style (.word-len), not by parentheses. Every word is an outbound link
// (wordUrl below). The game progress counter lives in the controls row
// above (Controls.tsx).
import type { Lang } from '../game/lang';
import type { Texts } from '../i18n';

function score(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

// where a played word points (new tab): english words open in Yandex
// Translate (the en→ru direction explains them), russian ones in gramota.ru's
// «Проверка слова» covering the толковые словари. The target follows the game
// language, not the UI language. Shared with the status line (StatusBar).
export function wordUrl(lang: Lang, word: string): string {
  if (lang === 'en')
    return 'https://translate.yandex.com/?source_lang=en&target_lang=ru&text=' + encodeURIComponent(word);
  return 'https://gramota.ru/poisk?mode=slovari&query=' + encodeURIComponent(word);
}

interface ScorePanelProps {
  playerWords: string[];
  botWords: string[];
  lang: Lang; // the game's language — decides where the words link to
  texts: Texts;
}

// the words newest first; words are unique within a game, so they key themselves
function renderWords(words: string[], lang: Lang) {
  return words
    .slice()
    .reverse()
    .map((word) => (
      <div key={word}>
        <a href={wordUrl(lang, word)} target="_blank" rel="noopener noreferrer">
          {word}
        </a>
        <span className="word-len">{word.length}</span>
      </div>
    ));
}

export function ScorePanel({ playerWords, botWords, lang, texts }: ScorePanelProps) {
  return (
    <div className="score-panel">
      <div className="score-columns">
        <div className="column-left">
          <div className="score-head">
            <span className="score-name">{texts.score.player}</span>
            <span className="score-num">{score(playerWords)}</span>
          </div>
          <div className="words">
            {renderWords(playerWords, lang)}
          </div>
        </div>
        <div className="column-right">
          <div className="score-head">
            <span className="score-name">{texts.score.computer}</span>
            <span className="score-num bot">{score(botWords)}</span>
          </div>
          <div className="words">
            {renderWords(botWords, lang)}
          </div>
        </div>
      </div>
    </div>
  );
}
