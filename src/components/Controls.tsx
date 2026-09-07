// The controls row under the board: only the game progress counter
// («Слово 7 из 21») rides it, dead center. The old «Заново»/«Отмена» buttons
// are gone — a game restarts from the new-game modal's start button (and the
// end panel's own), and the footer's undo button takes over both of the
// removed ones: a move in progress it cancels first, the next tap rolls the
// last played round back. The word itself is submitted by the drag release,
// so there is no submit button either.
import type { Texts } from '../i18n';

interface ControlsProps {
  texts: Texts;
  usedCount: number; // words played so far, the starting word included
  maxWords: number;
}

export function Controls({ texts, usedCount, maxWords }: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls-row">
        <div className="words-progress">{texts.score.progress(usedCount, maxWords)}</div>
      </div>
    </div>
  );
}
