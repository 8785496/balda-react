// Status line: the word being built (the original's #result) and #error,
// plus the computer's turn status.
interface StatusBarProps {
  result: string;
  error: string;
  status: string;
  botThinking: boolean;
}

export function StatusBar({ result, error, status, botThinking }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="result">
        {botThinking ? 'Компьютер думает…' : (status || result)}
      </div>
      <div className="error">{error}</div>
    </div>
  );
}
