// The board of SIZE × SIZE cells.
import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import type { Texts } from '../i18n';
import type { BotMove, Phase } from '../state/types';
import { hasFilledNeighbor } from '../state/helpers';
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
  onDragStartCell: (index: number) => void; // the drag left its start cell — anchor the path there
  onDragCell: (index: number) => void; // the pointer entered a cell mid-drag
  onDragSubmit: () => void; // the drag ended — send the word
}

// Drag-selection of the word (the word phase only): press a filled cell and
// draw through adjacent cells — the path builds as the pointer moves, and
// letting go submits the word. A press that never enters another cell stays a
// plain click: the native click fires on the cell exactly as before, so all
// click behaviors (append, undo the tip, reopen the letter keyboard) survive.
interface DragGesture {
  pointerId: number;
  start: number; // the cell where the press began
  last: number; // the last cell the pointer was over (-1 — a gap or outside)
  moved: boolean; // the pointer entered some other cell — the press is a drag
  rects: DOMRect[]; // cell geometry frozen at pointerdown
}

// -1 — the point is over a gap, the board frame or outside the board
function hitTest(rects: DOMRect[], x: number, y: number): number {
  return rects.findIndex((r) => x >= r.left && x < r.right && y >= r.top && y < r.bottom);
}

function useWordDrag(
  phase: Phase,
  board: string[],
  track: number[],
  onStartCell: (index: number) => void,
  onEnterCell: (index: number) => void,
  onSubmit: () => void,
) {
  // a latest-render mirror for the window listeners: they are added once per
  // gesture and must see the current callbacks, board and track
  const latest = useRef({ phase, board, track, onStartCell, onEnterCell, onSubmit });
  latest.current = { phase, board, track, onStartCell, onEnterCell, onSubmit };
  const gesture = useRef<DragGesture | null>(null);
  // a drag released on its start cell still fires a native click there —
  // swallow that one click so it cannot pop a cell or reopen the keyboard
  const suppressClick = useRef(false);

  function stop() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    gesture.current = null;
  }

  function onPointerMove(e: PointerEvent) {
    const g = gesture.current;
    if (g === null || e.pointerId !== g.pointerId)
      return;
    if ((e.buttons & 1) === 0) {
      // the button was released outside the window — its pointerup is lost;
      // end the gesture, keep the drawn path for an explicit submit
      stop();
      return;
    }
    const hit = hitTest(g.rects, e.clientX, e.clientY);
    if (hit === g.last)
      return;
    if (hit === -1) {
      g.last = -1; // off the cells — pause; re-entering a cell counts again
      return;
    }
    if (!g.moved && hit === g.start) {
      g.last = hit; // a wiggle off and back — the press is still a click
      return;
    }
    if (!g.moved) {
      g.moved = true;
      latest.current.onStartCell(g.start);
    }
    g.last = hit;
    latest.current.onEnterCell(hit);
  }

  function onPointerUp(e: PointerEvent) {
    const g = gesture.current;
    if (g === null || e.pointerId !== g.pointerId)
      return;
    if (g.moved) {
      // letting go sends the word; a path of a single cell is not a word yet —
      // keep it for editing instead of flashing a validation error
      if (hitTest(g.rects, e.clientX, e.clientY) === g.start)
        suppressClick.current = true;
      if (latest.current.track.length >= 2)
        latest.current.onSubmit();
    }
    stop();
  }

  function onPointerCancel(e: PointerEvent) {
    if (gesture.current === null || e.pointerId !== gesture.current.pointerId)
      return;
    // e.g. the browser took the gesture over — end it, keep the path as drawn
    stop();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (gesture.current !== null)
      return; // a second pointer while a gesture is running
    const p = latest.current;
    if (p.phase !== 'word' || !e.isPrimary || e.button !== 0)
      return;
    const rects = Array.from(
      e.currentTarget.children,
      (c) => (c as HTMLElement).getBoundingClientRect(),
    );
    const hit = hitTest(rects, e.clientX, e.clientY);
    if (hit === -1 || p.board[hit] === '')
      return; // a gap or an empty cell — there is nothing to drag from
    gesture.current = { pointerId: e.pointerId, start: hit, last: hit, moved: false, rects };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }

  function onClickCapture(e: ReactMouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
    }
  }

  return { onPointerDown, onClickCapture };
}

export function Board({ board, track, numChar, selectedCell, phase, botMove, boardRef, texts, onCellClick, onDragStartCell, onDragCell, onDragSubmit }: BoardProps) {
  const drag = useWordDrag(phase, board, track, onDragStartCell, onDragCell, onDragSubmit);
  // idle — choosing an empty cell; letter — the keyboard is open, and a tap on
  // another empty cell moves the pending letter there; word — building the path
  const interactive = phase === 'idle' || phase === 'letter' || phase === 'word';
  // while a spot for the new letter is being chosen, empty cells with no
  // letters around them are not legal spots — dimmed and unclickable
  const choosing = phase === 'idle' || phase === 'letter';
  // the word class turns on touch-action: none — without it a touch drag is
  // stolen by scrolling before the path can build (styles/index.css)
  const classes = phase === 'word' ? 'board word' : 'board';
  return (
    <div
      className={classes}
      role="grid"
      aria-label={texts.boardAria}
      ref={boardRef}
      onPointerDown={drag.onPointerDown}
      onClickCapture={drag.onClickCapture}
    >
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
            disabled={choosing && letter === '' && !hasFilledNeighbor(board, i)}
            onClick={() => {
              if (interactive) onCellClick(i);
            }}
          />
        );
      })}
    </div>
  );
}
