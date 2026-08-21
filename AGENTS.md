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

## Browser testing

GUI changes (layout, highlights, statuses) can additionally be verified in a real browser. **Never start it on your own — ask the user first and wait for an explicit go-ahead.** When the user approves, offer to switch this work to the cheap model (**GLM-5-Turbo**, a subagent or a separate session) instead of the main model: it is routine, screenshot-heavy work. Run it on the main model only if the user declines the switch.

1. `npm run dev` in the background; open the printed URL (the port shifts from 5173 when busy; the base path is `/balda-react/`).
2. Drive the page with the session's browser automation. Stable hooks: `.board .cell` (25 buttons in board order), `.keyboard`, `.turn`, `.result`, `.error`, `.words-progress`.
3. One full round: click the empty cell above the «а» of «балда» (`.nth(6)`) → enter «ф» on the keyboard → click the path **including the added-letter cell** — cells 6, 11, 12, 13, 14 → «Готово» (gives «фалда»; without the letter cell the word stays «алда» and submit fails). Check:
   - the turn badge flips «Ход: игрок» → «Ход: компьютер» → «Ход: игрок»;
   - path cells carry `.cell-num` numbers 1..n while building;
   - after the reply `.result` shows «Компьютер: «слово» (+N)» and the bot's cells carry `.bot`/`.bot-new` — for ~3 s only (`BOT_MOVE_HIGHLIGHT_MS` in `App.tsx`); assert the classes while the badge is back at «Ход: игрок», then again after ~3.5 s (must be gone);
   - `.words-progress` grows («Слово 3 из 21» after this round).
4. Worth an occasional pass: a validation error keeps the path; «Отмена»/Escape rolls the move back; Backspace unwinds the path and, once it is empty, reopens the keyboard.

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
- **A state machine** instead of the original's attaching of listeners: `phase: 'idle' | 'letter' | 'word' | 'bot' | 'over'` — the game starts immediately in `idle` (the original's «Старт»/menu screen is dropped). Cycle: `idle` (choosing an empty cell) → `letter` (the letter keyboard floats at the selected cell) → `word` (clicks on adjacent cells build the `track`) → `SUBMIT_MOVE` → `bot` (an effect in App calls `findBestMove` via `setTimeout`) → `idle`; with 21 words in `usedWords` — `over` (EndPanel instead of `alert()`). `word` → `letter` is a back-transition: the keyboard reappears at the added-letter cell to change the letter of an existing move.
- **Bot's turn**: `useEffect` in App when `phase === 'bot'`; the result arrives as the `BOT_MOVED` action (`null` = no move, skip).
- **Physical keyboard**: in the `letter` phase a letter (ё → е) enters it, `Escape` cancels the move, `Enter` in the `word` phase submits, `Backspace` steps the move back (the last path cell, then the letter).
- **Board themes**: the palette is a set of CSS custom properties; `data-theme` on `<html>` (set from App, persisted in localStorage; `index.html` hardcodes `neon` for the first paint) switches it. Default: `neon` (`DEFAULT_THEME`); empty cells are styled via `.cell:empty`. A saved id that is no longer in `THEMES` falls back to the default. The ThemePicker swatches and the rules icon-link live in the page footer (`App.tsx`).

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
5. UI cleanups: the «Старт» screen is dropped (the game starts immediately); the submit button is «Готово» (was «Ход»), is disabled until a word path exists and is the single large primary button, while «Заново» is a small secondary button on its own row with a two-tap confirmation («Точно?», 3 s) — a stray tap next to «Готово» can no longer destroy the game; the letter keyboard floats anchored to the selected cell (below it in the top half of the board, above in the bottom half — `Keyboard.tsx` measures the cell and positions the panel in `.board-wrap`) instead of the original's top-of-screen overlay, so it opens where the click/tap happened and neither the cursor nor the thumb travels far (the board stays interactive around it; «Отмена» lives on the keyboard panel in the `letter` phase, and a tap on another empty cell moves the pending letter there — the panel follows); the theme picker and the rules link live in the footer.
6. Path editing (the original offered none): a validation error keeps the `track` instead of clearing it; a click on the last path cell — or `Backspace`/the «⌫» button — removes that cell; a click on the added letter already in the path, or `Backspace` with an empty path, reopens the keyboard to change the letter without dropping the move (the `word → letter` back-transition; canceling there returns to `word`). The added-letter cell itself must stay normally clickable so the letter can enter the path — hence the click-to-edit only in the mid-path case.
