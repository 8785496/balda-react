// Floating letter keyboard anchored to the selected cell: it opens right
// next to the tapped cell — below it in the top half of the board, above in
// the bottom half — so neither the cursor nor the thumb has to travel far,
// and it follows the cell when the letter is re-targeted. The board stays
// interactive around the panel; the move is dropped by «Отмена» in the
// controls row.
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Texts } from '../i18n';
import { alphabetFor, type Lang } from '../game/lang';
import { SIZE } from '../game/constants';

interface KeyboardProps {
  boardRef: RefObject<HTMLDivElement | null>; // the .board grid, for the cell's position
  cellIndex: number;                          // the selected cell the panel anchors to
  lang: Lang;                                 // whose alphabet to show
  texts: Texts;
  onLetter: (char: string) => void;
}

export function Keyboard({ boardRef, cellIndex, lang, texts, onLetter }: KeyboardProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Place the panel by measured geometry: the cells' offsetParent is
  // .board-wrap (relative) and the panel is absolute in the same host, so
  // the two coordinate systems match. useLayoutEffect positions the panel
  // before the first paint, so it never flashes in a wrong spot.
  useLayoutEffect(() => {
    function place() {
      const board = boardRef.current;
      const panel = panelRef.current;
      if (!board || !panel)
        return;
      const cell = board.children[cellIndex] as HTMLElement | undefined;
      if (!cell)
        return;
      const host = cell.offsetParent as HTMLElement | null;
      const hostWidth = host ? host.clientWidth : 0;
      // centered on the cell, clamped into the board column
      const left = Math.min(
        Math.max(cell.offsetLeft + cell.offsetWidth / 2 - panel.offsetWidth / 2, 4),
        Math.max(4, hostWidth - panel.offsetWidth - 4),
      );
      const below = Math.floor(cellIndex / SIZE) < SIZE / 2;
      const top = below
        ? cell.offsetTop + cell.offsetHeight + 8
        : cell.offsetTop - panel.offsetHeight - 8;
      setPos({ left, top: Math.max(top, 4) });
    }
    place();
    // re-targeting moves the panel; a resize re-measures everything
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [boardRef, cellIndex]);

  return (
    <div
      className="keyboard-panel"
      ref={panelRef}
      style={pos === null ? undefined : { left: pos.left, top: pos.top }}
      role="group"
      aria-label={texts.keyboard.aria}
    >
      <div className="keyboard-title">
        <span>{texts.keyboard.title}</span>
      </div>
      <div className="keyboard">
        {alphabetFor(lang).split('').map((char) => (
          <button key={char} type="button" onClick={() => onLetter(char)}>
            {char}
          </button>
        ))}
      </div>
    </div>
  );
}
