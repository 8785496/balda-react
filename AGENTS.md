# Balda (React) — project context

The "Balda" word game (human vs computer) on **Vite + React + TypeScript**. A port of the ES5 original (`../balda`) preserving game logic and behavior 1:1. No state management libraries — `useReducer`. Dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` + types. Node.js ≥ 20.19.

## Running and commands

```bash
npm install
npm run dev      # dev server
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # production preview
npm run check    # node logic-check script (compiles scripts/check.ts into .tmp-check and runs it)
```

There is no test framework — correctness of the logic is verified by `npm run check` and the manual checklist from PLAN.md.

## Structure

| File | Role |
|------|------|
| `index.html` | Skeleton: `<div id="root">`, Play / Open Sans fonts via an https `<link>` |
| `src/main.tsx` | Entry point (StrictMode) |
| `src/App.tsx` | `useReducer(gameReducer)`, the bot turn effect, physical keyboard keydown |
| `src/styles/index.css` | Styles based on the original's `css/style.css`; all colors are CSS variables, board themes are `[data-theme='…']` blocks (wood/paper/night/neon; `:root` keeps the original's classic palette as the base fallback — no longer selectable) |
| `src/theme.ts` | Board color themes: ids, Russian names, swatch colors, localStorage persistence |
| `src/game/constants.ts` | ALPHABET (32 letters, no "ё"), SIZE=5, START_WORD='балда', MAX_WORDS=21, START_ROW |
| `src/game/dictionary.ts` | Dictionary of ~16,000 words (~290 KB, one line) — converted from the original's `out3.js` |
| `src/game/dic.ts` | From `dictionary2.js`: base-32 hashes + binary search; `findWord()`, `hasPrefix()` |
| `src/game/finder.ts` | From `track2.js`: `findBestMove(board, usedWords)` |
| `src/state/types.ts` | `GameState`, `Phase`, `Action`, `BotMove` |
| `src/state/gameReducer.ts` | All move and validation logic (from `events.js`) |
| `src/state/helpers.ts` | `neighbors`, `areAdjacent`, `wordFromTrack`, `hasFilledNeighbor` |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel, ThemePicker |
| `scripts/check.ts` | Logic check script |

## Architecture

- **State is the source of truth, not the DOM**: the board is `board: string[25]` (25 cells, `''` = empty) in `useReducer`; cells are `<button class="cell">`. The dictionary is bundled as an ES module; hashes are built on load.
- **A state machine** instead of the original's attaching of listeners: `phase: 'menu' | 'idle' | 'letter' | 'word' | 'bot' | 'over'`. Cycle: `idle` (choosing an empty cell) → `letter` (the virtual keyboard is open) → `word` (clicks on adjacent cells build the `track`) → `SUBMIT_MOVE` → `bot` (an effect in App calls `findBestMove` via `setTimeout`) → `idle`; with 21 words in `usedWords` — `over` (EndPanel instead of `alert()`).
- **Bot's turn**: `useEffect` in App when `phase === 'bot'`; the result arrives as the `BOT_MOVED` action (`null` = no move, skip).
- **Physical keyboard**: in the `letter` phase a letter (ё → е) enters it, `Escape` cancels the move, `Enter` in the `word` phase submits.
- **Board themes**: the palette is a set of CSS custom properties; `data-theme` on `<html>` (set from App, persisted in localStorage; `index.html` hardcodes `neon` for the first paint) switches it. Default: `neon` (`DEFAULT_THEME`); empty cells are styled via `.cell:empty`. A saved id that is no longer in `THEMES` falls back to the default.

### Game model (as in the original)

- The starting word "балда" in the middle row (cells 10–14); points = the total length of composed words (1 per letter); the game lasts until 21 words are in `usedWords`.
- Submit validation is a port of `events.validate` with the same error texts: «Слово должно содержать добавленную букву», «Слово "…" уже использовано», «Слово "…" не найдено», «Добавьте букву», «Выберите слово».
- Dictionary: base-32 hash (letter position + 1) × 32^i; sorted arrays of the full dictionary and prefixes of length 2–9; words longer than 10 letters never make it into the hashes (the original's filter). Binary search.

## Conventions

- TypeScript strict, ES modules.
- **Language: files (code, docs), code comments and commit messages — in English.** Game-facing texts (UI, validation messages, dictionary) stay in Russian — they are part of the game logic and parity with the original.
- UTF-8 encoding; the dictionary in `src/game/dictionary.ts` is encoding-critical (`<meta charset="UTF-8">` is declared in `index.html`).
- The algorithms in `dic.ts` / `finder.ts` are ported from the original; do not change their structure without need.

## Typical tasks

- **Change game rules/logic** — `src/state/gameReducer.ts` (and `src/state/types.ts`).
- **Speed up the move search** — `src/game/finder.ts` (the search) and `src/game/dic.ts` (word checks).
- **Replace/extend the dictionary** — only the contents of the `dictionary` array in `src/game/dictionary.ts` (words ≤ 10 letters take part in the search, no "ё", lowercase; hashes are built on load).
- **UI/layout** — `src/components/` + `src/styles/index.css`.
- **Add/recolor a board theme** — a `[data-theme='…']` variable block in `src/styles/index.css` + an entry in `THEMES` (`src/theme.ts`); no other places.

## Known fixes relative to the original

1. "Отмена" resets `numChar` (in the original the highlight stayed and caused a false validation error).
2. Neighbor check `i > 5` → `i >= 5` (cell 5 could not see its top neighbor) — `helpers.ts`, `finder.ts`.
3. No move for the bot — the turn is skipped (the original crashed).
4. The hidden `#time` and `#emulator` ("Help") were not ported.
