# Balda (React)

**Demo: <https://8785496.github.io/balda-react/>** (GitHub Pages, rebuilt on every push to `main`)

The "Balda" word game (human vs computer) — a port of the plain-JavaScript original to **Vite + React + TypeScript**. Game logic and behavior are ported 1:1; the Russian dictionary is an MIT-licensed list of ~35,600 common nouns (Harrix/Russian-Nouns) that replaces the original's ~16,000-word list. The footer switches the game language (**RUS | ENG**, each with its own alphabet/dictionary/starting word — «балда» / «crane») and the bot difficulty (**easy | medium | hard**; hard is the original's always-longest-word bot). Everything is bundled — no external requests except Google Fonts.

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
| `src/App.tsx` | `useReducer`, the bot turn effect, physical keyboard handler, the footer switchers |
| `src/styles/index.css` | Styles based on the original's `style.css` |
| `src/game/` | Pure logic, no React or DOM |
| `src/game/constants.ts` | SIZE=5, MAX_WORDS=21, START_ROW (language-independent) |
| `src/game/lang.ts` | Per-language config: alphabet, starting word, dictionary; `dicFor(lang)` |
| `src/game/dictionary.ts` | Russian dictionary: `export const dictionary` (~35,600 nouns, see the file header) |
| `src/game/dictionary-en.ts` | English dictionary (~22,900 common words, see the file header) |
| `src/game/dic.ts` | From `dictionary2.js`: `createDic(words, alphabet)` — base-32 hashes + binary search; `findWord()`, `hasPrefix()` |
| `src/game/finder.ts` | From `track2.js`: `findBestMove(board, usedWords, lang, difficulty)` — collects all moves, picks by difficulty |
| `src/state/types.ts` | `GameState`, `Phase`, `Action`, structured `GameError`/`Status` |
| `src/state/gameReducer.ts` | All move and validation logic (from `events.js`) |
| `src/state/helpers.ts` | Cell neighbors, word from a path, adjacency check |
| `src/i18n.ts` | All UI texts of both languages (validation messages included) |
| `src/lang.ts` | Language switcher state: ids/labels + localStorage |
| `src/difficulty.ts` | Difficulty ids + localStorage |
| `src/theme.ts` | Theme ids/swatches + localStorage (names live in `i18n.ts`) |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel, ThemePicker, LangPicker, DifficultyPicker |
| `scripts/check.ts` | Logic check without a test framework (`npm run check`) |

## Architecture

- State, not DOM: the board is `board: string[25]` in `useReducer`; cells are `<button>`.
- An explicit `phase` state machine: the game starts right away in `idle` (choosing an empty cell) `→ letter` (entering a letter) `→ word` (building the path) `→ SUBMIT → bot → idle`; the game ends with `over` at 21 words.
- The original's algorithms (dictionary hashes, DFS move search) are ported unchanged: only the packaging changes (ES modules, types) and DOM reads are removed.
- Bot's turn: after a successful submit, a `useEffect` calls `findBestMove` via `setTimeout`, so the UI has time to show the player's word and the «Компьютер думает…» status.
- Language: `GameState.lang` carries the alphabet/dictionary/starting word in use; the footer switcher restarts the game in the other language (with a two-tap confirmation if the game has progress). All rendered texts come from `src/i18n.ts`; validation errors and bot statuses are stored as structured codes and localized on render.
- Difficulty: the search records every word the bot can play (deduplicated by word); easy/medium pick randomly from the shortest/middle third of them, hard takes the longest — the original's behavior. Switching applies from the bot's next turn, no restart.

### Differences from the original (otherwise behavior is 1:1)

- Responsive layout (grid + `clamp()`), physical keyboard input (a letter, `Escape` — cancel, `Enter` — submit, `Backspace` — step the move back), end of game as a panel instead of `alert()`.
- Beyond the original: the language switcher (Russian/English with its own dictionary) and the bot difficulty switcher.
- The Russian dictionary is replaced: ~35,600 common nouns (Harrix/Russian-Nouns, MIT) instead of the original's ~16,000-word list — the game accepts and finds noticeably more words.
- The game starts immediately — the original's "Старт" screen with an empty board is dropped; the submit button («Готово», the original's «Ход») is disabled until a word path exists; «Отмена» shows only while the path is being built (in the letter phase the keyboard overlay covers the page); the theme picker and the rules link live in the footer.
- The path can be edited instead of being rebuilt: a validation error no longer clears it; a click on the last path cell (or `Backspace` / the «⌫» button) removes it; a click on the added letter mid-path (or `Backspace` with an empty path) reopens the keyboard to change the letter without canceling the move.
- Fixed: "Отмена" now also resets the highlight of the added letter (`numChar`).
- Fixed: neighbor check `i > 5` → `i >= 5` (cell 5 could not see its top neighbor).
- Fixed: when the computer has no move, the turn is skipped (the original crashed).
- Not ported: the hidden `#time` and `#emulator` ("Help") elements.

## Rules

A word is composed from adjacent letters on the board, must contain the added letter, and each word counts once. Points — 1 per letter; the starting word sits in the middle row — "балда" in Russian, "crane" in English. [Game rules (Russian)](https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29) · [Game rules (English)](https://en.wikipedia.org/wiki/Balda_(game))
