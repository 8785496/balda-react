// Строка состояния: строящееся слово (#result) и ошибка (#error) оригинала,
// плюс статус хода компьютера.
interface StatusBarProps {
  result: string;
  error: string;
  status: string;
  botThinking: boolean;
}

export function StatusBar({ result, error, status, botThinking }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-row">
        <div className="result">
          {botThinking ? 'Компьютер думает…' : (status || result)}
        </div>
        <a
          href="https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29"
          target="_blank"
          rel="noreferrer"
        >
          Правила игры
        </a>
      </div>
      <div className="error">{error}</div>
    </div>
  );
}
