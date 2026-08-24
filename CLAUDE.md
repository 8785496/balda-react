# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**`AGENTS.md` is the canonical, detailed project context** (structure table, architecture notes, the browser-testing checklist, the full list of deviations from the original game). Read it before non-trivial work; keep it updated when behavior changes. This file is the short orientation.

## Commands

```bash
npm install
npm run dev      # vite dev server on 127.0.0.1, base path /balda-react/
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # production preview
npm run check    # logic check: compiles scripts/check.ts into .tmp-check/ and runs it with node
```

There is **no test framework and no linter**. `npm run check` is the whole automated suite: one script of `assert()` calls (dictionary lookups, move search, difficulty caps, a full simulated game) that exits non-zero on failure. It takes no arguments — there is no way to run a single check; edit `scripts/check.ts` if you need to isolate one. Type checking happens only via `npm run build` (or `npx tsc --noEmit`).

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Architecture

A port of an ES5 original (`../balda`) to Vite + React 19 + TypeScript, behavior-compatible 1:1. No state library, no router, no external requests at runtime except Google Fonts — the dictionaries are bundled ES modules.

- **All state lives in one `useReducer`** (`src/state/gameReducer.ts`); the DOM is never read for game state. The board is `board: string[25]` (`''` = empty cell), cells are `<button class="cell">`.
- **A `phase` state machine** drives everything: `idle` (pick an empty cell adjoining letters) → `letter` (floating keyboard anchored at that cell) → `word` (one pointer drag builds `track`; release submits) → `bot` → `idle`, ending in `over` at 21 words. Adding a UI interaction usually means a new `Action` in `src/state/types.ts` plus a case in the reducer — not local component state.
- **The bot turn is an effect, not reducer logic**: `App.tsx` watches `phase === 'bot'`, calls `findBestMove` behind a `setTimeout` (`BOT_TURN_DELAY_MS`), and dispatches `BOT_MOVED` (`null` = skip turn).
- **Pure game layer** in `src/game/` — no React, no DOM. `dic.ts` builds a prefix tree (trie) per language; `finder.ts` walks the board depth-first carrying the current trie node, so a branch dies as soon as no word continues the prefix. `pickMove` in `finder.ts` selects among all found words by difficulty.
- **Two game languages** (RUS/ENG) with separate alphabets, dictionaries and starting words, bound in `src/game/lang.ts` (`dicFor`, `startWordFor`, `keyboardFor`). `GameState.lang` carries the active one; switching restarts the game.
- **Localization is structural**: validation errors and bot statuses are stored in state as codes (`GameError`, `Status`) and rendered through `TEXTS[lang]` in `src/i18n.ts`. Never hardcode a game-facing string in a component.
- **Theming is CSS variables**: `data-theme` on `<html>` selects a `[data-theme='…']` block in `src/styles/index.css`; `src/theme.ts` holds ids, swatches and the `chrome` color that `App.tsx` writes into `meta[name="theme-color"]` live.

## Conventions

- TypeScript strict (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`), ES modules.
- **Code, comments, docs and commit messages are in English.** Only `src/i18n.ts` game texts and the dictionaries are in the game languages; the Russian text set preserves the original game's exact wording.
- **Commit messages carry no tool trailer.** Do not append `Co-Authored-By: Claude …`, `🤖 Generated with [Claude Code]…` or any other model/agent attribution line at the end of a commit message or a PR description — the message ends with its own text. The history records what changed, not what wrote it.
- UTF-8 is load-bearing: `src/game/dictionary*.ts` and `translate-en.ts` are single-line multi-hundred-KB data modules. On Windows, piping them through node's stdin mangles the encoding — the regeneration commands in each file header therefore read/write files instead.
- The ported algorithms in `dic.ts` / `finder.ts` should keep their structure: found words, their order and pruning semantics must stay identical (the simulated game in `npm run check` is what guards this).

## Where things live

| Task | Files |
|------|-------|
| Game rules / move validation | `src/state/gameReducer.ts`, `src/state/types.ts` |
| Move search, difficulty tuning | `src/game/finder.ts` (`pickMove`), `src/game/dic.ts` |
| UI texts, any new string | `src/i18n.ts` (both languages side by side) |
| Layout / styles | `src/components/`, `src/styles/index.css` (phone shell is the ≤560px query at the end) |
| A board theme | `[data-theme]` block in `index.css` + `THEMES` in `src/theme.ts` + names in `i18n.ts` |

## Dictionaries

Each of `src/game/dictionary.ts` (Russian, ~50.9k nouns), `src/game/dictionary-en.ts` (English, ~15.3k noun lemmas) and `src/game/translate-en.ts` (translations + IPA) carries its **full regeneration command in the file header** — including the whitelists/blocklists that shape the word list. Regenerate through those commands and re-add the header; do not hand-edit the data line. After changing the English dictionary, also run `node scripts/translate-en.mjs` (it caches downloads in `.tmp-translate/`).

## Browser testing

GUI changes can be verified in a real browser, but **never start the dev server and drive the browser on your own — ask first and wait for explicit approval.** `AGENTS.md` § "Browser testing" holds the stable selectors and the round-trip checklist to follow once approved.
