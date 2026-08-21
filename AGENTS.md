# Balda (React) — project context

The "Balda" word game (human vs computer) on **Vite + React + TypeScript**. A port of the ES5 original (`../balda`) preserving game logic and behavior 1:1. No state management libraries — `useReducer`. Dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` + types. Node.js ≥ 20.19.

Beyond the original: the footer switches the **game language** (RUS | ENG — each with its own alphabet, dictionary and starting word) and the **bot difficulty** (легко/средне/сложно; "hard" is the original's always-longest-word bot).

## Running and commands

```bash
npm install
npm run dev      # dev server
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # production preview
npm run check    # node logic-check script (compiles scripts/check.ts into .tmp-check and runs it)
```

There is no test framework — correctness of the logic is verified by `npm run check` and the manual checklist in "Browser testing" below.

## Browser testing

GUI changes (layout, highlights, statuses) can additionally be verified in a real browser. **Never start it on your own — ask the user first and wait for an explicit go-ahead.** When the user approves, offer to switch this work to the cheap model (**GLM-5-Turbo**, a subagent or a separate session) instead of the main model: it is routine, screenshot-heavy work. Run it on the main model only if the user declines the switch.

1. `npm run dev` in the background; open the printed URL (the port shifts from 5173 when busy; the base path is `/balda-react/`).
2. Drive the page with the session's browser automation. Stable hooks: `.board .cell` (25 buttons in board order), `.keyboard`, `.turn`, `.result`, `.error`, `.words-progress`.
3. One full round. The starting word is random — first read the middle row (`.board .cell` 10–14), then play any word that adds one letter to it (an invalid try keeps the path, so wording out is cheap; validation errors are part of what you check anyway). When the middle row happens to be «балда»: click the empty cell above the second «а» (`.nth(6)`) → enter «ф» on the keyboard → click the path **including the added-letter cell** — cells 6, 11, 12, 13, 14 → «Готово» (gives «фалда»; without the letter cell the word stays «алда» and submit fails). Check:
   - the turn badge flips «Ход: игрок» → «Ход: компьютер» → «Ход: игрок»;
   - path cells carry `.cell-num` numbers 1..n while building;
   - after the reply `.result` shows «Компьютер: «слово» (+N)» and the bot's cells carry `.bot`/`.bot-new` — for ~3 s only (`BOT_MOVE_HIGHLIGHT_MS` in `App.tsx`); assert the classes while the badge is back at «Ход: игрок», then again after ~3.5 s (must be gone);
   - `.words-progress` grows («Слово 3 из 21» after this round).
4. Worth an occasional pass: a validation error keeps the path; «Отмена»/Escape rolls the move back; Backspace unwinds the path and, once it is empty, reopens the keyboard.
5. Drag selection (word phase): after placing the letter, press a path cell and drag it through the word — the `.cell-num` numbers and `.select` highlights follow the pointer, dragging back over the path unwinds it, and releasing the pointer submits the word (the badge flips to the computer). A press released on the same cell without entering another one must still behave as a plain click (append / pop the tip / reopen the keyboard over the added letter).

## Structure

| File | Role |
|------|------|
| `index.html` | Skeleton: `<div id="root">`, Play / Open Sans fonts via an https `<link>` |
| `src/main.tsx` | Entry point (StrictMode) |
| `src/App.tsx` | `useReducer(gameReducer)`, the bot turn effect, physical keyboard keydown, the footer switchers (language, difficulty, theme) |
| `src/styles/index.css` | Styles based on the original's `css/style.css`; all colors are CSS variables, board themes are `[data-theme='…']` blocks (wood/paper/night/neon; `:root` keeps the original's classic palette as the base fallback — no longer selectable) |
| `src/theme.ts` | Board color themes: ids, swatch colors, localStorage persistence (display names live in `i18n.ts`) |
| `src/i18n.ts` | All UI texts of both languages (`TEXTS[lang]`), including the localized renderings of validation errors and bot statuses |
| `src/lang.ts` | Language switcher state: ids/labels + localStorage persistence |
| `src/difficulty.ts` | Difficulty ids + localStorage persistence |
| `src/game/constants.ts` | Language-independent constants: SIZE=5, MAX_WORDS=21, START_ROW |
| `src/game/lang.ts` | Per-language game config: `Lang` type, alphabet, random starting word (`startWordFor` picks a 5-letter dictionary word), dictionary binding; `dicFor(lang)` builds and caches the hashes |
| `src/game/dictionary.ts` | Russian dictionary of ~35,600 common nouns (~640 KB, one line) — from Harrix/Russian-Nouns `dist/russian_nouns.txt`, MIT (regeneration command in the file header); replaces the original's smaller `out3.js` list (~16,000 words) |
| `src/game/dictionary-en.ts` | English dictionary of ~22,900 common words (~225 KB, one line) — from dolph/dictionary `popular.txt` (regeneration command in the file header) |
| `src/game/dic.ts` | From `dictionary2.js`: `createDic(words, alphabet)` builds base-32 hashes + binary search; `findWord()`, `hasPrefix()` |
| `src/game/finder.ts` | From `track2.js`: `findBestMove(board, usedWords, lang, difficulty)` — records every found word (deduplicated), picks by difficulty |
| `src/state/types.ts` | `GameState`, `Phase`, `Action`, `BotMove`, structured `GameError`/`Status` |
| `src/state/gameReducer.ts` | All move and validation logic (from `events.js`) |
| `src/state/helpers.ts` | `neighbors`, `areAdjacent`, `wordFromTrack`, `hasFilledNeighbor` |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel, ThemePicker, LangPicker, DifficultyPicker |
| `scripts/check.ts` | Logic check script |

## Architecture

- **State is the source of truth, not the DOM**: the board is `board: string[25]` (25 cells, `''` = empty) in `useReducer`; cells are `<button class="cell">`. The dictionary is bundled as an ES module; hashes are built on load.
- **A state machine** instead of the original's attaching of listeners: `phase: 'idle' | 'letter' | 'word' | 'bot' | 'over'` — the game starts immediately in `idle` (the original's «Старт»/menu screen is dropped). Cycle: `idle` (choosing an empty cell that adjoins existing letters) → `letter` (the letter keyboard floats at the selected cell) → `word` (clicks or drags over adjacent cells build the `track`) → `SUBMIT_MOVE` → `bot` (an effect in App calls `findBestMove` via `setTimeout`) → `idle`; with 21 words in `usedWords` — `over` (EndPanel instead of `alert()`). `word` → `letter` is a back-transition: the keyboard reappears at the added-letter cell to change the letter of an existing move.
- **Bot's turn**: `useEffect` in App when `phase === 'bot'`; the result arrives as the `BOT_MOVED` action (`null` = no move, skip).
- **Physical keyboard**: in the `letter` phase a letter (ё → е) enters it, `Escape` cancels the move, `Enter` in the `word` phase submits, `Backspace` steps the move back (the last path cell, then the letter).
- **Drag word selection** (the `word` phase only): the path can be drawn in one pointer gesture — press a filled cell and drag through adjacent cells (`useWordDrag` in `Board.tsx`; pointer events, so mouse/pen/touch all work), releasing submits the word (a path of a single cell is kept for editing instead of erroring). Dragging back over the path unwinds it; a drag begun on a path cell rewinds to it, and one begun from an unrelated cell replaces the path — the fast redo after a validation error. The semantics live in the `DRAG_START`/`DRAG_CELL` reducer actions; a press that never enters another cell stays a plain click (`CLICK_CELL`), so every click behavior survives unchanged — the only native click swallowed is the one following a drag released on its start cell (`onClickCapture`). `.board` carries the `word` class in the word phase for `touch-action: none` (otherwise a touch drag is stolen by scrolling); `user-select: none` keeps text selection out of the gesture.
- **Board themes**: the palette is a set of CSS custom properties; `data-theme` on `<html>` (set from App, persisted in localStorage; `index.html` hardcodes `night` for the first paint) switches it. Picker order: night, neon, wood, paper; default: `night` (`DEFAULT_THEME`); empty cells are styled via `.cell:empty`. A saved id that is no longer in `THEMES` falls back to the default. The ThemePicker swatches and the rules icon-link live in the page footer (`App.tsx`).
- **Game language**: `GameState.lang` (set at `freshGame(lang)`, kept by a plain `NEW_GAME`) carries the alphabet, dictionary and starting word in use (`game/lang.ts`). The footer LangPicker restarts the game in the other language — with the same two-tap confirmation as «Заново» when the game has progress, immediately otherwise. All rendered texts come from `TEXTS[lang]` (`i18n.ts`); validation errors and bot statuses are stored in the state as structured codes (`GameError`, `Status`) and localized on render, so no game text is hardcoded in components.
- **Bot difficulty**: `findBestMove` records every word the bot could play (deduplicated by word) and `pickMove` chooses: hard — the longest (the original's behavior, first found among equals); easy/medium — a random word from the shortest/middle third of the moves by length. Switching difficulty applies from the bot's next turn, without a restart. Default: `hard` (`DEFAULT_DIFFICULTY`).

### Game model (as in the original)

- The starting word in the middle row (cells 10–14) is drawn at random from the language's 5-letter dictionary words (`startWordFor` in `game/lang.ts`, a different word each game — the original always used "балда"); it is the first entry of `usedWords`; points = the total length of composed words (1 per letter); the game lasts until 21 words are in `usedWords`. `freshGame(lang, startWord?)` accepts a forced word — used by `scripts/check.ts` to keep its reference positions deterministic.
- Submit validation is a port of `events.validate` with the same checks in the same order; the error texts live in `i18n.ts` as the Russian renderings of the codes `noAddedLetter` («Слово должно содержать добавленную букву»), `wordUsed` («Слово "…" уже использовано»), `wordNotFound` («Слово "…" не найдено»), `addLetter` («Добавьте букву»), `chooseWord` («Выберите слово»).
- Dictionary: base-32 hash (letter position + 1) × 32^i over the language's alphabet; sorted arrays of the full dictionary and prefixes of length 2–9; words longer than 10 letters never make it into the hashes (the original's filter). Binary search.

## Conventions

- TypeScript strict, ES modules.
- **Language: files (code, docs), code comments and commit messages — in English.** Game-facing texts live in `src/i18n.ts` — the Russian set preserves the original's wording (parity), the English set is its translation; do not hardcode game texts in components. Dictionaries stay in their own languages by definition.
- UTF-8 encoding; the dictionaries in `src/game/dictionary*.ts` are encoding-critical (`<meta charset="UTF-8">` is declared in `index.html`).
- The algorithms in `dic.ts` / `finder.ts` are ported from the original; do not change their structure without need (the difficulty selection in `pickMove` and the all-moves collection are deliberate extensions).

## Typical tasks

- **Change game rules/logic** — `src/state/gameReducer.ts` (and `src/state/types.ts`).
- **Speed up the move search** — `src/game/finder.ts` (the search) and `src/game/dic.ts` (word checks).
- **Replace/extend the dictionary** — only the contents of the `dictionary` array: Russian in `src/game/dictionary.ts` (words ≤ 10 letters take part in the search, no "ё", lowercase), English in `src/game/dictionary-en.ts` (a–z only; the regeneration command is in its header). Hashes are built per language on first use.
- **Change UI texts / add a translation** — `src/i18n.ts` only (both languages side by side).
- **Tune the difficulty levels** — `pickMove` in `src/game/finder.ts`.
- **UI/layout** — `src/components/` + `src/styles/index.css`.
- **Add/recolor a board theme** — a `[data-theme='…']` variable block in `src/styles/index.css` + an entry in `THEMES` (`src/theme.ts`) + its names in `i18n.ts`; no other places.

## Known fixes relative to the original

1. "Отмена" resets `numChar` (in the original the highlight stayed and caused a false validation error).
2. Neighbor check `i > 5` → `i >= 5` (cell 5 could not see its top neighbor) — `helpers.ts`, `finder.ts`.
3. No move for the bot — the turn is skipped (the original crashed).
4. The hidden `#time` and `#emulator` ("Help") were not ported.
5. UI cleanups: the «Старт» screen is dropped (the game starts immediately); the submit button is «Готово» (was «Ход»; until a letter is chosen it names the missing step — «Добавьте букву»), is disabled until a word path exists and is the single large primary button of the word-phase row «Отмена» — «Готово» — «⌫», while «Заново» is a small secondary button on its own row with a two-tap confirmation («Точно?», 3 s) — a stray tap next to «Готово» can no longer destroy the game; the letter keyboard floats anchored to the selected cell (below it in the top half of the board, above in the bottom half — `Keyboard.tsx` measures the cell and positions the panel in `.board-wrap`) instead of the original's top-of-screen overlay, so it opens where the click/tap happened and neither the cursor nor the thumb travels far (the board stays interactive around it; «Отмена» lives on the keyboard panel in the `letter` phase, and a tap on another empty cell moves the pending letter there — the panel follows); the theme picker and the rules link live in the footer.
6. Path editing (the original offered none): a validation error keeps the `track` instead of clearing it; a click on the last path cell — or `Backspace`/the «⌫» button — removes that cell; a click on the added letter already in the path, or `Backspace` with an empty path, reopens the keyboard to change the letter without dropping the move (the `word → letter` back-transition; canceling there returns to `word`). The added-letter cell itself must stay normally clickable so the letter can enter the path — hence the click-to-edit only in the mid-path case.
7. Additions beyond the original: the language switcher (RUS | ENG — a second alphabet/dictionary/starting word, all texts localized via `i18n.ts`; switching restarts the game, two-tap-confirmed when in progress), the difficulty switcher (easy/medium pick from the shortest/middle third of the bot's found moves, hard = the original's longest word) and the random starting word (a random 5-letter dictionary word each game; the original always started with "балда").
8. An empty cell with no letters around it cannot be chosen for the new letter — in `idle` and in the `letter` re-target (`hasFilledNeighbor` in `gameReducer.ts`); such cells are dimmed and unclickable in the choosing phases (`disabled` in `Board.tsx`). The original allowed any empty cell, and a letter placed in isolation could enter no word, dead-ending the move until «Отмена».
9. The Russian dictionary is replaced: ~35,600 common nouns from Harrix/Russian-Nouns (MIT; nouns/lemmas only, like the original's list) instead of the original's ~16,000-word `out3.js` list. Same filtering rules as the English dictionary: lowercase, "ё" → "е", length 2–10; the regeneration command is in the file header.
10. Drag word selection (addition): the path can be drawn with one pointer trajectory instead of cell-by-cell clicks — press + drag builds it live (highlight, numbers, the word in the status bar), dragging back unwinds it, and releasing submits the word (word-search style; a 1-cell path is kept rather than erroring). Implemented as the `DRAG_START`/`DRAG_CELL` reducer actions plus the `useWordDrag` gesture hook in `Board.tsx` — click vs drag is decided by whether the pointer ever entered another cell, so plain clicks keep their exact behavior.
