# Code review — balda-react

Date: 2026-08-21
Verdict: **the code is in good shape**. `npm run check` (all 40+ checks) and `npm run build` pass. No Critical or High findings — only Medium (real but recoverable) and Low (code hygiene).

The logic was compared against the original `../balda` (`js/events.js`, `js/track2.js`, `js/init.js`): no behavioral differences found beyond the deliberately documented ones. The original's bugs (`i > 5`, the bot's crash on no move) are fixed consistently in both places (`helpers.ts`, `finder.ts`).

Total: **4 Medium, 7 Low**.

---

## Critical — none

## High — none

## Medium

### M1. Keyboard shortcuts ignore modifiers — `src/App.tsx:45-49`

In the `letter` phase, a routine Ctrl+С (copy) or Ctrl+Ф enters a letter: `e.key` with a modifier held is still an alphabet letter. Triggered by an everyday accidental action; the effect is undoable ("Отмена"), hence Medium rather than High.

Fix — one line at the top of the handler:

```ts
if (e.ctrlKey || e.metaKey || e.altKey) return;
```

### M2. The bot's move is invisible on the board

After `BOT_MOVED` the new letter is not highlighted anywhere — the player has to spot it by diffing the board by eye. The data for a highlight already exists: `lastBotMove` (`src/state/types.ts:30`) is written but read by no component. Affects every round of the game; parity with the original is a minus here, not a justification.

Fix — highlight `.add` on the cell `lastBotMove.index` (or drop the dead field, see L1).

### M3. A dead end with no way to finish the game

If the player has no move at all, "Ход" forever yields «Добавьте букву»/an error — the only way out is "Заново"; the EndPanel never appears. Rare, but it is a lost game without a formal finale. In the original the hidden `#emulator` was a theoretical way out; it was deliberately not ported.

Fix — a "resign/finish" button (a rules change — a product decision).

### M4. The project's only "test" is checked without `--strict`

`scripts/check.ts` is not included in tsconfig (`include: ["src"]`), and the `check` script in `package.json:14` compiles it without strict — nobody catches type errors in the checking code.

Verified: with `--strict --noEmit` the script compiles cleanly. Fix — add the flag to the `check` command.

## Low

### L1. Dead code

- `hasFilledNeighbor` (`src/state/helpers.ts:30`) is used nowhere — the bot search inlines the neighbor check (`finder.ts:68-73`).
- `lastBotMove` is written but never read (see M2).

### L2. Duplication

- `BotMove` is declared twice: `src/game/finder.ts:14` and `src/state/types.ts:12` (works via structural typing, but may drift; `types.ts` could import the type from `finder.ts`).
- Score computation: `scoreOf` (`src/App.tsx:14`) and `score` (`src/components/ScorePanel.tsx:2`) — move to `state/helpers.ts`.

### L3. Enter double-fire — `src/App.tsx:53`

With focus on a button, Enter triggers both `SUBMIT_MOVE` and the button's click. The phase guards in the reducer currently save the day, but `e.preventDefault()` for Enter in the `word` phase would remove the dependence on event ordering.

### L4. Accessibility

- `role="grid"` without `row`/`gridcell` structure (`src/components/Board.tsx:17`) — either drop the role or add the structure.
- No `aria-live="polite"` for errors/result (`src/components/StatusBar.tsx`).
- Empty cells are buttons with no accessible name (an `aria-label` with the coordinate would do).

### L5. Legacy id

`id="test"` (`src/components/Controls.tsx:23`) — from the original, unused by the CSS; rename to `submit` or drop.

### L6. Hardcoded `10` in `check.ts:197`

`playerWords.length === 10` breaks if `MAX_WORDS` changes; compute it as `(MAX_WORDS - 1) / 2`.

### L7. Cancel is hard to discover in the letter phase

The "Отмена" button in Controls is covered by the overlay; what remains is Escape and clicking outside the panel. A cancel button inside the keyboard panel itself would be more obvious.

---

## Verified and confirmed

- **Hash precision**: the maximum for a 10-letter word ≈ 1.2×10¹⁵ < 2⁵³ — double-precision integer arithmetic is exact, no collisions.
- **Binary search**: `findHash` is safe at edge cases (empty array, `lowerBound > upperBound`).
- **`hasPrefix`** correctly prunes paths of length 10 (longer words are not in the hashes) — confirmed by the full-game simulation to 21 words in `check.ts`.
- **The bot turn effect** (`src/App.tsx:26-34`) is StrictMode-safe (timer cleanup); the dependencies cause no extra runs — nothing changes `board`/`usedWords` in the `bot` phase.
- **`#result` parity**: in the original `events.change()` also wipes the result line after every validate/cancel, so "result derived from the path" is an accurate port.
- **The original's `setTrack`** contained the same `i > 5` bugs; the port sidesteps them by keeping only the `areAdjacent` check — equivalent and cleaner.
- **The reducer**: phase guards are correct in every action; error texts and the validation order are ported verbatim.

## Suggested fix order

1. M1, M4 — one-line fixes.
2. M2 — the biggest payoff.
3. M3 — needs a product decision.
4. L1–L7 — one small commit.
