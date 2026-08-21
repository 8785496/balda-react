# Balda (React)

**Demo: <https://8785496.github.io/balda-react/>** (GitHub Pages, rebuilt on every push to `main`)

The "Balda" word game (human vs computer) — a port of the plain-JavaScript original to **Vite + React + TypeScript**. Game logic and behavior are ported 1:1; the dictionary is the same (~16,000 words, bundled — no external requests except Google Fonts).

## Running

Requires Node.js ≥ 20.19.

```bash
npm install
npm run dev      # dev server
npm run build    # type check + build into dist/
npm run preview  # preview of the build
npm run check    # node logic-check script (dictionary, move search)
```

## Structure

| File / directory | Role |
|------|------|
| `index.html` | Skeleton: `<div id="root">`, Play / Open Sans fonts via `<link>` |
| `src/main.tsx` | Entry point |
| `src/App.tsx` | `useReducer`, the bot turn effect, physical keyboard handler |
| `src/styles/index.css` | Styles based on the original's `style.css` |
| `src/game/` | Pure logic, no React or DOM |
| `src/game/constants.ts` | ALPHABET (32 letters, no "ё"), SIZE=5, START_WORD='балда', MAX_WORDS=21 |
| `src/game/dictionary.ts` | Dictionary: `export const dictionary` (~290 KB, converted from `out3.js`) |
| `src/game/dic.ts` | From `dictionary2.js`: base-32 hashes + binary search; `findWord()`, `hasPrefix()` |
| `src/game/finder.ts` | From `track2.js`: `findBestMove(board, usedWords)` — takes the board as an array |
| `src/state/types.ts` | `GameState`, `Phase`, `Action` |
| `src/state/gameReducer.ts` | All move and validation logic (from `events.js`) |
| `src/state/helpers.ts` | Cell neighbors, word from a path, adjacency check |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel |
| `scripts/check.ts` | Logic check without a test framework (`npm run check`) |

## Architecture

- State, not DOM: the board is `board: string[25]` in `useReducer`; cells are `<button>`.
- An explicit `phase` state machine: `menu → idle` (choosing an empty cell) `→ letter` (entering a letter) `→ word` (building the path) `→ SUBMIT → bot → idle`; the game ends with `over` at 21 words.
- The original's algorithms (dictionary hashes, DFS move search) are ported unchanged: only the packaging changes (ES modules, types) and DOM reads are removed.
- Bot's turn: after a successful submit, a `useEffect` calls `findBestMove` via `setTimeout`, so the UI has time to show the player's word and the «Компьютер думает…» status.

### Differences from the original (otherwise behavior is 1:1)

- Responsive layout (grid + `clamp()`), physical keyboard input (a letter, `Escape` — cancel, `Enter` — submit), end of game as a panel instead of `alert()`.
- Fixed: "Отмена" now also resets the highlight of the added letter (`numChar`).
- Fixed: neighbor check `i > 5` → `i >= 5` (cell 5 could not see its top neighbor).
- Fixed: when the computer has no move, the turn is skipped (the original crashed).
- Not ported: the hidden `#time` and `#emulator` ("Help") elements.

## Rules

A word is composed from adjacent letters on the board, must contain the added letter, and each word counts once. Points — 1 per letter; the starting word is "балда" in the middle row. [Game rules (Russian)](https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29)
