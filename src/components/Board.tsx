// The board of SIZE × SIZE cells.
import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import type { Texts } from '../i18n';
import type { BotMove, Phase } from '../state/types';
import { hasFilledNeighbor } from '../state/helpers';
import { tap } from '../haptics';
import { Cell } from './Cell';

interface BoardProps {
  board: string[];
  track: number[];
  shownTrack: number[] | null; // a played word's path tapped in a score list — shown on the board
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

// Drag-selection of the word (the word phase only) — the single way a word is
// entered: press a filled cell and draw through adjacent cells, the path builds
// as the pointer moves, and letting go submits the word. A press that never
// enters another cell is a plain click and does nothing.
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
      // end the gesture, keep the drawn path for a new drag or «Отмена»
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
      // keep it (the next drag continues or replaces it) instead of flashing
      // a validation error
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

  return { onPointerDown };
}

export function Board({ board, track, shownTrack, numChar, selectedCell, phase, botMove, boardRef, texts, onCellClick, onDragStartCell, onDragCell, onDragSubmit }: BoardProps) {
  const drag = useWordDrag(phase, board, track, onDragStartCell, onDragCell, onDragSubmit);
  // idle — choosing an empty cell; letter — the keyboard is open: a tap on
  // another empty cell moves the pending letter there, on the selected cell
  // it dismisses the panel; word — the drag builds the word, and a plain
  // click reopens the keyboard on the added letter's cell or moves the
  // letter to another legal spot, the keyboard with it (the reducer tells
  // the cases apart)
  const clickable = phase === 'idle' || phase === 'letter' || phase === 'word';
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
    >
      {board.map((letter, i) => {
        const trackPos = track.indexOf(i);
        // while the computer's move is highlighted, its word path carries the
        // same order numbers — so the word can be read off the board; where
        // the player is already drawing their own next word, their track wins,
        // and the shown (tapped-in-a-list) path yields to both live highlights
        const botPos = botMove !== null ? botMove.track.indexOf(i) : -1;
        const shownPos = shownTrack !== null ? shownTrack.indexOf(i) : -1;
        const num = trackPos !== -1
          ? trackPos + 1
          : botPos !== -1
            ? botPos + 1
            : shownPos !== -1
              ? shownPos + 1
              : null;
        return (
          <Cell
            key={i}
            letter={letter}
            inTrack={trackPos !== -1}
            trackNumber={num}
            shown={shownPos !== -1}
            isNew={numChar === i}
            isSelected={selectedCell === i}
            bot={botMove !== null && botMove.track.indexOf(i) !== -1}
            botNew={botMove !== null && botMove.index === i}
            disabled={choosing && letter === '' && !hasFilledNeighbor(board, i)}
            onClick={() => {
              if (clickable) {
                tap();
                onCellClick(i);
              }
            }}
          />
        );
      })}
    </div>
  );
}
