// Поиск лучшего хода компьютера — перенос js/track2.js на TypeScript.
// Алгоритм перенесён без изменений: для каждой пустой клетки со смежной
// непустой подставляются все буквы алфавита, из каждой непустой клетки
// запускается рекурсивный обход путей по 4 направлениям; путь не должен
// пересекать сам себя, ветка отсекается, если ни одно слово не имеет
// текущего префикса. Возвращается самое длинное слово, содержащее
// добавленную букву и не использованное ранее.
// Отличия от оригинала: поле передаётся массивом (без чтения DOM),
// исправлена проверка соседа сверху (i > 5 → i >= 5), при отсутствии
// хода возвращается null вместо падения.
import { dic } from './dic';
import { ALPHABET, SIZE } from './constants';

export interface BotMove {
  word: string;
  char: string;
  index: number;
}

export function findBestMove(board: string[], usedWords: string[]): BotMove | null {
  // лучшее найденное слово
  let gWord = '';
  let gChar = '';
  let gIndex = -1;

  // рекурсивный поиск путей
  // arrData — данные поля, arrWord — координаты пути,
  // cur — номер текущей ячейки, ins — номер ячейки с подставленной буквой
  function findTrack(arrData: string[], arrWord: number[], cur: number, ins: number): void {
    if (arrData[cur] === '') // текущая ячейка пустая
      return;
    // путь не должен пересекать сам себя
    if (arrWord.length > 0 && arrWord.indexOf(cur) !== -1)
      return;
    // добавляем текущую ячейку в путь
    arrWord.push(cur);
    if (arrWord.length > 1) {
      let word = '';
      for (let k = 0; k < arrWord.length; k++)
        word += arrData[arrWord[k]];
      // если слово длиннее ранее найденного и путь содержит добавленную букву
      if (arrWord.length > gWord.length)
        if (arrWord.indexOf(ins) !== -1)
          if (dic.findWord(word))
            if (usedWords.indexOf(word) === -1) {
              gWord = word;
              gChar = arrData[ins];
              gIndex = ins;
            }
      // продолжать поиск бессмысленно: слов с таким префиксом нет
      if (!dic.hasPrefix(word))
        return;
    }
    // рекурсивный вызов в 4 направлениях
    if (cur < SIZE * (SIZE - 1))
      findTrack(arrData, arrWord.slice(), cur + SIZE, ins);
    if (cur >= SIZE)
      findTrack(arrData, arrWord.slice(), cur - SIZE, ins);
    if (cur % SIZE < SIZE - 1)
      findTrack(arrData, arrWord.slice(), cur + 1, ins);
    if (cur % SIZE > 0)
      findTrack(arrData, arrWord.slice(), cur - 1, ins);
  }

  // цикл подстановок
  for (let i = 0; i < board.length; i++) {
    // пустая ячейка со смежной непустой (исправлено i > 5 → i >= 5)
    if (!board[i] && (
      (i < SIZE * (SIZE - 1) && board[i + SIZE]) ||
      (i >= SIZE && board[i - SIZE]) ||
      (i % SIZE < SIZE - 1 && board[i + 1]) ||
      (i % SIZE > 0 && board[i - 1])
    )) {
      for (let k = 0; k < ALPHABET.length; k++) {
        const arrTemp = board.slice();
        arrTemp[i] = ALPHABET[k];
        // ищем пути, начиная с непустых ячеек
        for (let j = 0; j < board.length; j++)
          if (arrTemp[j] !== '')
            findTrack(arrTemp, [], j, i);
      }
    }
  }

  return gWord !== '' ? { word: gWord, char: gChar, index: gIndex } : null;
}
