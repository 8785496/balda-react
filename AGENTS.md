# Балда (React) — контекст проекта

Игра «Балда» (человек против компьютера) на **Vite + React + TypeScript**. Перенос ES5-оригинала (`../balda`) с сохранением игровой логики и поведения 1:1. Библиотек состояния нет — `useReducer`. Зависимости: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` + типы. Node.js ≥ 20.19.

## Запуск и команды

```bash
npm install
npm run dev      # dev-сервер
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # предпросмотр сборки
npm run check    # node-скрипт проверки логики (компилирует scripts/check.ts в .tmp-check и запускает)
```

Автотестов (тестового фреймворка) нет — корректность логики проверяется `npm run check` и ручным чек-листом из PLAN.md.

## Структура

| Файл | Роль |
|------|------|
| `index.html` | Каркас: `<div id="root">`, шрифты Play / Open Sans через `<link>` по https |
| `src/main.tsx` | Точка входа (StrictMode) |
| `src/App.tsx` | `useReducer(gameReducer)`, эффект хода бота, keydown физической клавиатуры |
| `src/styles/index.css` | Стили на базе `css/style.css` оригинала |
| `src/game/constants.ts` | ALPHABET (32 буквы без «ё»), SIZE=5, START_WORD='балда', MAX_WORDS=21, START_ROW |
| `src/game/dictionary.ts` | Словарь ~16 000 слов (~290 КБ, одна строка) — конвертация `out3.js` оригинала |
| `src/game/dic.ts` | Из `dictionary2.js`: base-32 хэши + бинарный поиск; `findWord()`, `hasPrefix()` |
| `src/game/finder.ts` | Из `track2.js`: `findBestMove(board, usedWords)` |
| `src/state/types.ts` | `GameState`, `Phase`, `Action`, `BotMove` |
| `src/state/gameReducer.ts` | Вся логика ходов и валидации (из `events.js`) |
| `src/state/helpers.ts` | `neighbors`, `areAdjacent`, `wordFromTrack`, `hasFilledNeighbor` |
| `src/components/` | Board, Cell, Keyboard, Controls, ScorePanel, StatusBar, EndPanel |
| `scripts/check.ts` | Проверочный скрипт логики |

## Архитектура

- **Источник истины — состояние, а не DOM**: поле — `board: string[25]` (25 клеток, `''` = пустая) в `useReducer`; ячейки — `<button class="cell">`. Словарь бандлится как ES-модуль, хэши строятся при загрузке.
- **Машина состояний** вместо навешивания слушателей оригинала: `phase: 'menu' | 'idle' | 'letter' | 'word' | 'bot' | 'over'`. Цикл: `idle` (выбор пустой клетки) → `letter` (открыта виртуальная клавиатура) → `word` (клики по смежным клеткам строят `track`) → `SUBMIT_MOVE` → `bot` (эффект в App вызывает `findBestMove` через `setTimeout`) → `idle`; при 21 слове в `usedWords` — `over` (EndPanel вместо `alert()`).
- **Ход бота**: `useEffect` в App при `phase === 'bot'`; результат приходит экшеном `BOT_MOVED` (`null` = нет хода, пропуск).
- **Физическая клавиатура**: в фазе `letter` буква (ё → е) вводит её, `Escape` — отмена хода, `Enter` в фазе `word` — «Ход».

### Игровая модель (как в оригинале)

- Стартовое слово «балда» в средней строке (клетки 10–14); очки = суммарная длина составленных слов (по 1 за букву); игра до 21 слова в `usedWords`.
- Валидация «Хода» — перенос `events.validate` с теми же текстами ошибок: «Слово должно содержать добавленную букву», «Слово "…" уже использовано», «Слово "…" не найдено», «Добавьте букву», «Выберите слово».
- Словарь: base-32 хэш (позиция буквы + 1) × 32^i; отсортированные массивы полного словаря и префиксов длины 2–9; слова длиннее 10 букв в хэши не попадают (фильтр оригинала). Бинарный поиск.

## Соглашения

- TypeScript strict, ES-модули; комментарии — на русском.
- Кодировка UTF-8; словарь в `src/game/dictionary.ts` критичен для кодировки (в `index.html` объявлен `<meta charset="UTF-8">`).
- Алгоритмы `dic.ts` / `finder.ts` — перенесены из оригинала, менять их структуру без нужды не следует.

## Типичные задачи

- **Изменить правила/логику игры** — `src/state/gameReducer.ts` (и `src/state/types.ts`).
- **Ускорить поиск хода** — `src/game/finder.ts` (перебор) и `src/game/dic.ts` (проверки слов).
- **Заменить/пополнить словарь** — только содержимое массива `dictionary` в `src/game/dictionary.ts` (слова ≤ 10 букв попадают в поиск, без «ё», нижний регистр; хэши строятся при загрузке).
- **UI/верстка** — `src/components/` + `src/styles/index.css`.

## Известные исправления относительно оригинала

1. «Отмена» сбрасывает `numChar` (в оригинале оставалась подсветка и ложная ошибка валидации).
2. Проверка соседей `i > 5` → `i >= 5` (клетка 5 «не видела» верхнего соседа) — `helpers.ts`, `finder.ts`.
3. Нет хода у бота — пропуск хода (в оригинале падало).
4. Скрытые `#time` и `#emulator` («Помощь») не переносились.
