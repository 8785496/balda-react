// Board geometry and path handling. The neighbor checks from the original
// (js/events.js, js/track2.js) are collected here; fixed the bug where
// i > 5 should have been i >= 5 — cell 5 could not see its top neighbor.
import { SIZE } from '../game/constants';

// indexes of adjacent cells (no diagonals)
export function neighbors(i: number): number[] {
  const res: number[] = [];
  if (i < SIZE * (SIZE - 1)) res.push(i + SIZE);
  if (i >= SIZE) res.push(i - SIZE);
  if (i % SIZE < SIZE - 1) res.push(i + 1);
  if (i % SIZE > 0) res.push(i - 1);
  return res;
}

// whether two cells are adjacent
export function areAdjacent(a: number, b: number): boolean {
  return neighbors(a).indexOf(b) !== -1;
}

// the word built from a path
export function wordFromTrack(board: string[], track: number[]): string {
  let result = '';
  for (let i = 0; i < track.length; i++)
    result += board[track[i]];
  return result;
}

// whether an empty cell has any non-empty neighbors
export function hasFilledNeighbor(board: string[], i: number): boolean {
  const nb = neighbors(i);
  for (let k = 0; k < nb.length; k++)
    if (board[nb[k]] !== '')
      return true;
  return false;
}
