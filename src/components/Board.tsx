// Поле SIZE × SIZE.
import type { Phase } from '../state/types';
import { Cell } from './Cell';

interface BoardProps {
  board: string[];
  track: number[];
  numChar: number | null;
  selectedCell: number | null;
  phase: Phase;
  onCellClick: (index: number) => void;
}

export function Board({ board, track, numChar, selectedCell, phase, onCellClick }: BoardProps) {
  const interactive = phase === 'idle' || phase === 'word';
  return (
    <div className="board" role="grid" aria-label="Игровое поле">
      {board.map((letter, i) => (
        <Cell
          key={i}
          letter={letter}
          inTrack={track.indexOf(i) !== -1}
          isNew={numChar === i}
          isSelected={selectedCell === i}
          onClick={() => {
            if (interactive) onCellClick(i);
          }}
        />
      ))}
    </div>
  );
}
