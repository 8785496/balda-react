// Словарь и поиск по нему — перенос js/dictionary2.js на TypeScript.
// Строка хэшируется как число в базе 32: (позиция буквы в алфавите + 1) × 32^i,
// где i отсчитывается с конца строки. На загрузке строятся отсортированные
// массивы хэшей: полный словарь и префиксные массивы длин 2–9,
// поиск — классический бинарный поиск.
import { dictionary } from './dictionary';
import { ALPHABET } from './constants';

// Максимальная длина слова в хэшах: длинные слова словаря игнорируются (как в оригинале)
const MAX_WORD_LEN = 10;

// хэш строки как числа в базе 32
function str2hash(str: string): number {
  let id = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const sym = str[len - i - 1];
    id += (ALPHABET.indexOf(sym) + 1) * Math.pow(32, i);
  }
  return id;
}

// классический бинарный поиск (перенос из оригинала)
function findHash(searchKey: number, hash: number[]): boolean {
  let lowerBound = 0;
  let upperBound = hash.length - 1;
  let curIn: number;
  while (true) {
    curIn = Math.floor((lowerBound + upperBound) / 2);
    if (hash[curIn] === searchKey)
      return true; // элемент найден
    else if (lowerBound > upperBound)
      return false; // элемент не найден
    // деление диапазона
    if (hash[curIn] < searchKey)
      lowerBound = curIn + 1; // в верхней половине
    else
      upperBound = curIn - 1; // в нижней половине
  }
}

// полный словарь (слова длины 2..10)
const dic_hash: number[] = [];
// префиксные массивы: prefix_hash[n - 2] — префиксы длины n слов длиннее n
const prefix_hash: number[][] = [];
for (let n = 2; n <= 9; n++) prefix_hash.push([]);

// хэшируем словарь
for (let i = 0; i < dictionary.length; i++) {
  if (dictionary[i].length > MAX_WORD_LEN) continue;
  if (dictionary[i].length > 1)
    dic_hash.push(str2hash(dictionary[i]));
  for (let n = 2; n <= 9; n++) {
    if (dictionary[i].length > n)
      prefix_hash[n - 2].push(str2hash(dictionary[i].substr(0, n)));
  }
}

// сортируем массивы и убираем дубликаты соседних значений
function compareNumbers(a: number, b: number): number {
  return a - b;
}

function sortUnique(hash: number[]): number[] {
  hash.sort(compareNumbers);
  const res: number[] = [];
  for (let i = 0; i < hash.length; i++)
    if (res.length === 0 || res[res.length - 1] !== hash[i])
      res.push(hash[i]);
  return res;
}

const dicSorted = sortUnique(dic_hash);
const prefixSorted = prefix_hash.map(sortUnique);

export const dic = {
  // поиск целого слова в словаре
  findWord(word: string): boolean {
    return findHash(str2hash(word), dicSorted);
  },
  // поиск части слова: есть ли слова с данным префиксом
  hasPrefix(req: string): boolean {
    switch (req.length) {
      case 1:
        return ALPHABET.indexOf(req) !== -1;
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
        return findHash(str2hash(req), prefixSorted[req.length - 2]);
      default:
        return false;
    }
  },
};
