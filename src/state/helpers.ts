// Геометрия поля и работа с путём. Проверки соседей из оригинала
// (js/events.js, js/track2.js) собраны здесь; исправлена ошибка
// i > 5 вместо i >= 5 — клетка 5 «не видела» верхнего соседа.
import { SIZE } from '../game/constants';

// индексы смежных ячеек (без диагоналей)
export function neighbors(i: number): number[] {
  const res: number[] = [];
  if (i < SIZE * (SIZE - 1)) res.push(i + SIZE);
  if (i >= SIZE) res.push(i - SIZE);
  if (i % SIZE < SIZE - 1) res.push(i + 1);
  if (i % SIZE > 0) res.push(i - 1);
  return res;
}

// смежность двух ячеек
export function areAdjacent(a: number, b: number): boolean {
  return neighbors(a).indexOf(b) !== -1;
}

// слово из пути
export function wordFromTrack(board: string[], track: number[]): string {
  let result = '';
  for (let i = 0; i < track.length; i++)
    result += board[track[i]];
  return result;
}

// есть ли у пустой ячейки непустые соседи
export function hasFilledNeighbor(board: string[], i: number): boolean {
  const nb = neighbors(i);
  for (let k = 0; k < nb.length; k++)
    if (board[nb[k]] !== '')
      return true;
  return false;
}
