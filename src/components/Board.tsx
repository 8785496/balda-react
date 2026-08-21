// The board of SIZE × SIZE cells.
import type { Ref } from 'react';
import type { Texts } from '../i18n';
import type { BotMove, Phase } from '../state/types';
import { Cell } from './Cell';

interface BoardProps {
  board: string[];
  track: number[];
  numChar: number | null;
  selectedCell: number | null;
  phase: Phase;
  botMove: BotMove | null; // the computer's last move, while it is highlighted
  boardRef?: Ref<HTMLDivElement>; // the floating letter keyboard anchors to the cells
  texts: Texts;
  onCellClick: (index: number) => void;
}

export function Board({ board, track, numChar, selectedCell, phase, botMove, boardRef, texts, onCellClick }: BoardProps) {
  // idle — choosing an empty cell; letter — the keyboard is open, and a tap on
  // another empty cell moves the pending letter there; word — building the path
  const interactive = phase === 'idle' || phase === 'letter' || phase === 'word';
  return (
    <div className="board" role="grid" aria-label={texts.boardAria} ref={boardRef}>
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
