// Модель состояния игры. Паттерн навешивания/снятия слушателей оригинала
// (setChar ⇄ setTrack) заменён явной машиной состояний в поле phase.

export type Phase =
  | 'menu'  // до нажатия «Старт»
  | 'idle'  // выбор пустой клетки
  | 'letter' // ввод буквы, открыта клавиатура
  | 'word'  // клики по смежным клеткам строят путь
  | 'bot'   // ход компьютера
  | 'over'; // партия закончена

export interface BotMove {
  word: string;
  char: string;
  index: number;
}

export interface GameState {
  phase: Phase;
  board: string[];             // 25 клеток, '' = пустая
  usedWords: string[];         // все слова партии, [0] = 'балда'
  playerWords: string[];       // слова игрока; счёт = сумма длин
  botWords: string[];          // слова компьютера
  selectedCell: number | null; // выбранная пустая клетка (фаза letter)
  numChar: number | null;      // клетка с новой буквой (подсветка .add)
  track: number[];             // путь — текущее слово
  boardBackup: string[] | null; // бэкап поля для «Отмена» (bakArr оригинала)
  result: string;              // строящееся/последнее слово (строка #result оригинала)
  error: string;               // текст ошибки валидации (#error оригинала)
  status: string;              // служебные сообщения («Компьютер думает…» и т.п.)
  lastBotMove: BotMove | null;
}

export type Action =
  | { type: 'START_GAME' }
  | { type: 'NEW_GAME' }
  | { type: 'CLICK_CELL'; index: number }
  | { type: 'SET_LETTER'; char: string }
  | { type: 'SUBMIT_MOVE' }
  | { type: 'CANCEL_MOVE' }
  | { type: 'BOT_MOVED'; move: BotMove | null };
