// The board of SIZE × SIZE cells.
import type { BotMove, Phase } from '../state/types';
import { Cell } from './Cell';

interface BoardProps {
  board: string[];
  track: number[];
  numChar: number | null;
  selectedCell: number | null;
  phase: Phase;
  botMove: BotMove | null; // the computer's last move, while it is highlighted
  onCellClick: (index: number) => void;
}

export function Board({ board, track, numChar, selectedCell, phase, botMove, onCellClick }: BoardProps) {
  const interactive = phase === 'idle' || phase === 'word';
  return (
    <div className="board" role="grid" aria-label="Игровое поле">
      {board.map((letter, i) => {
        const trackPos = track.indexOf(i);
        return (
          <Cell
            key={i}
            letter={letter}
            inTrack={trackPos !== -1}
            trackNumber={trackPos === -1 ? null : trackPos + 1}
            isNew={numChar === i}
            isSelected={selectedCell === i}
            bot={botMove !== null && botMove.track.indexOf(i) !== -1}
            botNew={botMove !== null && botMove.index === i}
            onClick={() => {
              if (interactive) onCellClick(i);
            }}
          />
        );
      })}
    </div>
  );
}
