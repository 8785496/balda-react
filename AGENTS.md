# Balda (React) — project context

The "Balda" word game (human vs computer) on **Vite + React + TypeScript**. A port of the ES5 original (`../balda`) preserving game logic and behavior 1:1. No state management libraries — `useReducer`. Dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` + types. Node.js ≥ 20.19.

Beyond the original: the footer switches the **game language** (RUS | ENG — each with its own alphabet, dictionary and starting word) and the **bot difficulty** (легко/средне/сложно — easy/medium play words of at most 3/4 letters, hard the longest word, but at most 5 while the player is losing).

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
3. One full round. The starting word is random — first read the middle row (`.board .cell` 10–14), then play any word that adds one letter to it (an invalid try keeps the path, so wording out is cheap; validation errors are part of what you check anyway). When the middle row happens to be «балда»: click the empty cell above the second «а» (`.nth(6)`) → enter «ф» on the keyboard → press cell 6 and drag the pointer through cells 11, 12, 13, 14 (**including the added-letter cell** in the path) → release — the release submits the word (gives «фалда»; without the letter cell the word stays «алда» and submit fails). Check:
   - the turn badge flips «Ход: игрок» → «Ход: компьютер» → «Ход: игрок»;
   - path cells carry `.cell-num` numbers 1..n while building;
   - after the reply `.result` shows the bot's move — «Компьютер:», then the word (bold, `.status-word`) and its points (`.word-len`, e.g. +5) set off by style instead of quotes/parentheses — and the bot's cells carry `.bot`/`.bot-new` — for ~3 s only (`BOT_MOVE_HIGHLIGHT_MS` in `App.tsx`); assert the classes while the badge is back at «Ход: игрок», then again after ~3.5 s (must be gone);
   - `.words-progress` grows («Слово 3 из 21» after this round).
4. Worth an occasional pass: a validation error keeps the path (the error chip floats absolutely in the status bar — nothing below it moves); «Отмена»/Escape rolls the move back; a plain click on a filled cell in the word phase does nothing — the word is drawn by dragging only.
5. Drag selection (word phase): after placing the letter, press a path cell and drag it through the word — the `.cell-num` numbers and `.select` highlights follow the pointer, dragging back over the path unwinds it, and releasing the pointer submits the word (the badge flips to the computer; a 1-cell path is kept instead of erroring). A press released on the same cell without entering another one is a plain click and does nothing. In the word/letter phases «Отмена» sits on the same controls row as «Заново».

## Structure

| File | Role |
|------|------|
| `index.html` | Skeleton: `<div id="root">`, Play / Open Sans fonts via an https `<link>` |
| `src/main.tsx` | Entry point (StrictMode) |
| `src/App.tsx` | `useReducer(gameReducer)`, the bot turn effect, physical keyboard keydown, the footer switchers (language, difficulty, theme), the rules modal |
| `src/styles/index.css` | Styles based on the original's `css/style.css`; all colors are CSS variables, board themes are `[data-theme='…']` blocks (wood/paper/night/neon; `:root` keeps the original's classic palette as the base fallback — no longer selectable) |
| `src/theme.ts` | Board color themes: ids, swatch colors, localStorage persistence (display names live in `i18n.ts`) |
| `src/i18n.ts` | All UI texts of both languages (`TEXTS[lang]`), including the localized renderings of validation errors and bot statuses |
| `src/lang.ts` | Language switcher state: ids/labels + localStorage persistence |
| `src/difficulty.ts` | Difficulty ids + localStorage persistence |
| `src/game/constants.ts` | Language-independent constants: SIZE=5, MAX_WORDS=21, START_ROW |
| `src/game/lang.ts` | Per-language game config: `Lang` type, alphabet, random starting word (`startWordFor` picks a 5-letter dictionary word), dictionary binding; `dicFor(lang)` builds and caches the dictionary trees |
| `src/game/dictionary.ts` | Russian dictionary of ~50,900 common nouns (~1 MB, one line) — from Harrix/Russian-Nouns `dist/russian_nouns.txt`, MIT (regeneration command in the file header); replaces the original's smaller `out3.js` list (~16,000 words) |
| `src/game/dictionary-en.ts` | English dictionary of ~12,200 common noun lemmas (~119 KB, one line) — WordNet 3.1 noun lemmas (`dict/index.noun`) kept if present in dolph/dictionary `popular.txt` as the frequency filter (regeneration command in the file header) |
| `src/game/dic.ts` | The dictionary as a prefix tree (trie; a rework of `dictionary2.js`'s base-32 hash arrays + binary search): `createDic(words, alphabet)`; `findWord()`, `hasPrefix()` are root-to-node walks, `root`/`step()` let the move search advance one letter at a time |
| `src/game/finder.ts` | From `track2.js`: `findBestMove(board, usedWords, lang, difficulty)` — records every found word (deduplicated), picks by difficulty |
| `src/state/types.ts` | `GameState`, `Phase`, `Action`, `BotMove`, structured `GameError`/`Status` |
| `src/state/gameReducer.ts` | All move and validation logic (from `events.js`) |
| `src/state/helpers.ts` | `neighbors`, `areAdjacent`, `wordFromTrack`, `hasFilledNeighbor` |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel, RulesModal, ThemePicker, LangPicker, DifficultyPicker |
| `scripts/check.ts` | Logic check script |

## Architecture

- **State is the source of truth, not the DOM**: the board is `board: string[25]` (25 cells, `''` = empty) in `useReducer`; cells are `<button class="cell">`. The dictionary is bundled as an ES module; a prefix tree (trie) per language is built on load.
- **A state machine** instead of the original's attaching of listeners: `phase: 'idle' | 'letter' | 'word' | 'bot' | 'over'` — the game starts immediately in `idle` (the original's «Старт»/menu screen is dropped). Cycle: `idle` (choosing an empty cell that adjoins existing letters) → `letter` (the letter keyboard floats at the selected cell) → `word` (a single drag over adjacent cells builds the `track`, releasing the pointer submits it — `SUBMIT_MOVE`) → `bot` (an effect in App calls `findBestMove` via `setTimeout`) → `idle`; with 21 words in `usedWords` — `over` (EndPanel instead of `alert()`).
- **Bot's turn**: `useEffect` in App when `phase === 'bot'`; the result arrives as the `BOT_MOVED` action (`null` = no move, skip).
- **Physical keyboard**: in the `letter` phase a letter (ё → е) enters it; `Escape` cancels the move, or closes the rules modal when it is open. There is no Enter/Backspace handling — the word is submitted by the drag release.
- **Drag word selection** (the `word` phase only) — the single way a word is entered: press a filled cell and drag through adjacent cells (`useWordDrag` in `Board.tsx`; pointer events, so mouse/pen/touch all work), releasing submits the word (a path of a single cell is kept, not erroring). Dragging back over the path unwinds it; a drag begun on a path cell rewinds to it, and one begun from an unrelated cell replaces the path — the fast redo after a validation error. The semantics live in the `DRAG_START`/`DRAG_CELL` reducer actions; a press that never enters another cell is a plain click, and plain clicks do nothing in the word phase (`CLICK_CELL` only chooses the letter cell in `idle`/re-targets it in `letter`). `.board` carries the `word` class in the word phase for `touch-action: none` (otherwise a touch drag is stolen by scrolling); `user-select: none` keeps text selection out of the gesture.
- **Board themes**: the palette is a set of CSS custom properties; `data-theme` on `<html>` (set from App, persisted in localStorage; `index.html` hardcodes `neon` for the first paint) switches it. Picker order: neon, night, wood, paper; default: `neon` (`DEFAULT_THEME`); empty cells are styled via `.cell:empty`. A saved id that is no longer in `THEMES` falls back to the default. The ThemePicker swatches and the rules button live in the page footer (`App.tsx`).
- **Game language**: `GameState.lang` (set at `freshGame(lang)`, kept by a plain `NEW_GAME`) carries the alphabet, dictionary and starting word in use (`game/lang.ts`). The footer LangPicker restarts the game in the other language — with the same two-tap confirmation as «Заново» when the game has progress, immediately otherwise. All rendered texts come from `TEXTS[lang]` (`i18n.ts`); validation errors and bot statuses are stored in the state as structured codes (`GameError`, `Status`) and localized on render, so no game text is hardcoded in components.
- **Bot difficulty**: `findBestMove` records every word the bot could play (deduplicated by word) and `pickMove` chooses: easy — a random word of at most 3 letters; medium — at most 4; hard — the longest (the original's behavior, first found among equals), but at most 5 letters while the player is losing — App computes `playerLosing` from the scores and passes it to `findBestMove`. When no found word fits a level's cap, the shortest one is played. Switching difficulty applies from the bot's next turn, without a restart. Default: `medium` (`DEFAULT_DIFFICULTY`).

### Game model (as in the original)

- The starting word in the middle row (cells 10–14) is drawn at random from the language's 5-letter dictionary words (`startWordFor` in `game/lang.ts`, a different word each game — the original always used "балда"); it is the first entry of `usedWords`; points = the total length of composed words (1 per letter); the game lasts until 21 words are in `usedWords`. `freshGame(lang, startWord?)` accepts a forced word — used by `scripts/check.ts` to keep its reference positions deterministic.
- Submit validation is a port of `events.validate` with the same checks in the same order; the error texts live in `i18n.ts` as the Russian renderings of the codes `noAddedLetter` («Слово должно содержать добавленную букву»), `wordUsed` («Слово "…" уже использовано»), `wordNotFound` («Слово "…" не найдено»), `addLetter` («Добавьте букву»), `chooseWord` («Выберите слово»).
- Dictionary: a prefix tree (trie) — a node per prefix, children indexed by the letter's position in the language's alphabet; `findWord`/`hasPrefix` are single root-to-node walks, and the move search (`finder.ts`) carries the current node through its recursion, stepping the tree one letter per board cell instead of re-hashing the whole prefix and binary-searching it at every step (a branch dies the moment no word continues the prefix; a childless node means the prefix cannot grow). Words of any length enter the tree — the original's 10-letter cap is dropped; a board path is physically bounded by the 25 cells.

## Conventions

- TypeScript strict, ES modules.
- **Language: files (code, docs), code comments and commit messages — in English.** Game-facing texts live in `src/i18n.ts` — the Russian set preserves the original's wording (parity), the English set is its translation; do not hardcode game texts in components. Dictionaries stay in their own languages by definition.
- UTF-8 encoding; the dictionaries in `src/game/dictionary*.ts` are encoding-critical (`<meta charset="UTF-8">` is declared in `index.html`).
- The algorithms in `dic.ts` / `finder.ts` are ported from the original; do not change their structure without need (the difficulty selection in `pickMove` and the all-moves collection are deliberate extensions; so is the trie that replaced the original's hash arrays as the lookup structure — the found words, their order and the pruning semantics are unchanged).

## Typical tasks

- **Change game rules/logic** — `src/state/gameReducer.ts` (and `src/state/types.ts`).
- **Speed up the move search** — `src/game/finder.ts` (the search) and `src/game/dic.ts` (word checks).
- **Replace/extend the dictionary** — only the contents of the `dictionary` array: Russian in `src/game/dictionary.ts` (words of any length take part in the search, no "ё", lowercase), English in `src/game/dictionary-en.ts` (common noun lemmas, a–z only; the regeneration command is in its header). The trie is built per language on first use.
- **Change UI texts / add a translation** — `src/i18n.ts` only (both languages side by side).
- **Tune the difficulty levels** — `pickMove` in `src/game/finder.ts`.
- **UI/layout** — `src/components/` + `src/styles/index.css`.
- **Add/recolor a board theme** — a `[data-theme='…']` variable block in `src/styles/index.css` + an entry in `THEMES` (`src/theme.ts`) + its names in `i18n.ts`; no other places.

## Known fixes relative to the original

1. "Отмена" resets `numChar` (in the original the highlight stayed and caused a false validation error).
2. Neighbor check `i > 5` → `i >= 5` (cell 5 could not see its top neighbor) — `helpers.ts`, `finder.ts`.
3. No move for the bot — the turn is skipped (the original crashed).
4. The hidden `#time` and `#emulator` ("Help") were not ported.
5. UI cleanups: the «Старт» screen is dropped (the game starts immediately); there is no submit button at all — the drag release submits the word, so the word-phase controls are a single row of small secondary buttons: «Заново» on the left with a two-tap confirmation («Точно?», 3 s) and «Отмена» on the right (in the `letter`/`word` phases) — a stray tap can no longer destroy the game; the letter keyboard floats anchored to the selected cell (below it in the top half of the board, above in the bottom half — `Keyboard.tsx` measures the cell and positions the panel in `.board-wrap`) instead of the original's top-of-screen overlay, so it opens where the click/tap happened and neither the cursor nor the thumb travels far (the board stays interactive around it, and a tap on another empty cell moves the pending letter there — the panel follows); the theme picker and the rules button (a modal, see 12) live in the footer.
6. Error recovery (the original cleared the whole path): a validation error keeps the `track`, and a new drag reworks it — dragging back unwinds the path, a drag from an unrelated cell replaces it. There is no cell-by-cell editing: no click-to-pop, no letter-change back-transition, no Backspace — to change the added letter, cancel («Отмена»/Escape) and make the move again.
7. Additions beyond the original: the language switcher (RUS | ENG — a second alphabet/dictionary/starting word, all texts localized via `i18n.ts`; switching restarts the game, two-tap-confirmed when in progress), the difficulty switcher (easy/medium play words of at most 3/4 letters, hard the longest word — at most 5 while the player is losing; when nothing fits the cap, the shortest word) and the random starting word (a random 5-letter dictionary word each game; the original always started with "балда").
8. An empty cell with no letters around it cannot be chosen for the new letter — in `idle` and in the `letter` re-target (`hasFilledNeighbor` in `gameReducer.ts`); such cells are dimmed and unclickable in the choosing phases (`disabled` in `Board.tsx`). The original allowed any empty cell, and a letter placed in isolation could enter no word, dead-ending the move until «Отмена».
9. The Russian dictionary is replaced: ~50,900 common nouns from Harrix/Russian-Nouns (MIT; nouns/lemmas only, like the original's list) instead of the original's ~16,000-word `out3.js` list. Same filtering rules as the English dictionary: lowercase, "ё" → "е", length 2 and up (the original capped words at 10 letters — both dictionaries now ship words of any length); the regeneration command is in the file header.
10. Drag word selection (addition, and the only word input): the path is drawn with one pointer trajectory instead of cell-by-cell clicks — press + drag builds it live (highlight, numbers, the word in the status bar), dragging back unwinds it, and releasing submits the word (word-search style; a 1-cell path is kept rather than erroring). Implemented as the `DRAG_START`/`DRAG_CELL` reducer actions plus the `useWordDrag` gesture hook in `Board.tsx` — click vs drag is decided by whether the pointer ever entered another cell; plain clicks in the word phase do nothing.
11. The lookup structure is replaced: a prefix tree (trie) instead of the original's base-32 hash arrays with binary search (`dic.ts`); the move search steps the tree along the path (`finder.ts`). Same found words in the same order (verified by identical games in `npm run check`), roughly 5–9× faster on filled boards. Two strictness improvements over the old hashing: a word containing a letter outside the alphabet used to hash as if the letter were absent (so `findWord("аё…")` could alias a real word) — now it is simply not found; and `hasPrefix` of a single letter that starts no dictionary word used to return true — now false (no caller relied on either quirk).
12. The rules are a modal (`RulesModal.tsx`, opened by the footer "?" button, closed by ✕ / a backdrop click / Escape): a brief summary in the current language plus a link to the Russian Wikipedia article — the Russian wiki in both game languages (`RULES_WIKI_URL` in `i18n.ts`). The validation-error chip is absolutely positioned in a reserved slot of the status bar (`pointer-events: none`) — showing, hiding or wrapping it never reflows the layout below.
13. The words in the score lists are outbound links (new tab): english words open in Yandex Translate (en→ru), russian ones in gramota.ru's «Проверка слова» over the толковые словари (`wordUrl` in `ScorePanel.tsx`; the target follows the game language — `GameState.lang` — not the UI language). The bot's word in the status line is the same link (StatusBar). The lists render newest-first, and each word's letter count is a styled `.word-len` span, not parenthesized text.
14. The English dictionary is nouns-only (parity with the Russian one): WordNet 3.1 noun lemmas kept if present in `popular.txt` — ~11,300 common noun lemmas instead of the previous ~22,900 mixed-POS `popular.txt` list (the, eat, quickly were playable words before). Lemma-level parts of speech, so words with a noun sense stay (run, walk, jump, running); plurals are not lemmas and are gone.
