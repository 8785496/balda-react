import { useEffect, useReducer, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { EndPanel } from './components/EndPanel';
import { Keyboard } from './components/Keyboard';
import { ScorePanel } from './components/ScorePanel';
import { StatusBar } from './components/StatusBar';
import { ThemePicker } from './components/ThemePicker';
import { ALPHABET, MAX_WORDS } from './game/constants';
import { findBestMove } from './game/finder';
import { gameReducer, initialState } from './state/gameReducer';
import { wordFromTrack } from './state/helpers';
import { loadTheme, saveTheme, type ThemeId } from './theme';

// score — the sum of word lengths (1 point per letter)
function scoreOf(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

// how long the computer's move stays highlighted on the board
const BOT_MOVE_HIGHLIGHT_MS = 3000;

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  // the board grid element: the floating letter keyboard anchors to its cells
  const boardRef = useRef<HTMLDivElement | null>(null);

  // the color theme: data-theme on <html> switches the CSS variable set
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  // the computer's turn: after the player's successful submit. setTimeout lets
  // the UI show the player's word and the «Компьютер думает…» status before
  // the search starts.
  useEffect(() => {
    if (state.phase !== 'bot')
      return;
    const timer = setTimeout(() => {
      const move = findBestMove(state.board, state.usedWords);
      dispatch({ type: 'BOT_MOVED', move });
    }, 50);
    return () => clearTimeout(timer);
  }, [state.phase, state.board, state.usedWords]);

  // the computer's move is visible: its word path and the added letter stay
  // highlighted on the board for a few seconds. Keyed on the move itself, so
  // the countdown does not restart while the player is already building
  // their own next word.
  const [showBotMove, setShowBotMove] = useState(false);
  const lastBotMove = state.lastBotMove;
  useEffect(() => {
    if (lastBotMove === null) {
      setShowBotMove(false);
      return;
    }
    setShowBotMove(true);
    const timer = setTimeout(() => setShowBotMove(false), BOT_MOVE_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [lastBotMove]);

  // physical keyboard: a letter (ё → е) in the letter phase,
  // Escape — cancel, Enter in the word phase — submit,
  // Backspace — one step back (the last path cell, then the letter)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (state.phase === 'letter') {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          dispatch({ type: 'CANCEL_MOVE' });
          return;
        }
        let ch = e.key.toLowerCase();
        if (ch === 'ё')
          ch = 'е';
        if (ALPHABET.indexOf(ch) !== -1)
          dispatch({ type: 'SET_LETTER', char: ch });
      } else if (state.phase === 'word') {
        if (e.key === 'Escape')
          dispatch({ type: 'CANCEL_MOVE' });
        else if (e.key === 'Enter')
          dispatch({ type: 'SUBMIT_MOVE' });
        else if (e.key === 'Backspace')
          dispatch({ type: 'BACKSPACE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase]);

  return (
    <div className="context">
      <StatusBar
        result={wordFromTrack(state.board, state.track)}
        error={state.error}
        status={state.status}
        phase={state.phase}
      />
      <div className="board-wrap">
        <Board
          board={state.board}
          track={state.track}
          numChar={state.numChar}
          selectedCell={state.selectedCell}
          phase={state.phase}
          botMove={showBotMove ? lastBotMove : null}
          boardRef={boardRef}
          onCellClick={(index) => dispatch({ type: 'CLICK_CELL', index })}
        />
        {state.phase === 'letter' && state.selectedCell !== null && (
          <Keyboard
            boardRef={boardRef}
            cellIndex={state.selectedCell}
            onLetter={(char) => dispatch({ type: 'SET_LETTER', char })}
            onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
          />
        )}
        {state.phase === 'over' && (
          <EndPanel
            playerScore={scoreOf(state.playerWords)}
            botScore={scoreOf(state.botWords)}
            onRestart={() => dispatch({ type: 'NEW_GAME' })}
          />
        )}
      </div>
      <Controls
        phase={state.phase}
        canSubmit={state.phase === 'word' && state.track.length > 0}
        onRestart={() => dispatch({ type: 'NEW_GAME' })}
        onSubmit={() => dispatch({ type: 'SUBMIT_MOVE' })}
        onBack={() => dispatch({ type: 'BACKSPACE' })}
        onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
      />
      <ScorePanel
        playerWords={state.playerWords}
        botWords={state.botWords}
        usedCount={state.usedWords.length}
        maxWords={MAX_WORDS}
      />
      <footer className="footer">
        <a
          className="rules-icon"
          href="https://ru.wikipedia.org/wiki/%D0%91%D0%B0%D0%BB%D0%B4%D0%B0_%28%D0%B8%D0%B3%D1%80%D0%B0%29"
          target="_blank"
          rel="noreferrer"
          title="Правила игры"
          aria-label="Правила игры"
        >
          ?
        </a>
        <ThemePicker value={theme} onChange={setTheme} />
      </footer>
    </div>
  );
}
