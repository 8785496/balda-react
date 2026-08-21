import { useEffect, useReducer, useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { EndPanel } from './components/EndPanel';
import { Keyboard } from './components/Keyboard';
import { ScorePanel } from './components/ScorePanel';
import { StatusBar } from './components/StatusBar';
import { ThemePicker } from './components/ThemePicker';
import { ALPHABET } from './game/constants';
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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [theme, setTheme] = useState<ThemeId>(loadTheme);

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

  // physical keyboard: a letter (ё → е) in the letter phase,
  // Escape — cancel, Enter in the word phase — submit
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (state.phase === 'letter') {
        if (e.key === 'Escape') {
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
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase]);

  return (
    <div className="context">
      <ThemePicker value={theme} onChange={setTheme} />
      <StatusBar
        result={wordFromTrack(state.board, state.track)}
        error={state.error}
        status={state.status}
        botThinking={state.phase === 'bot'}
      />
      <div className="board-wrap">
        <Board
          board={state.board}
          track={state.track}
          numChar={state.numChar}
          selectedCell={state.selectedCell}
          phase={state.phase}
          onCellClick={(index) => dispatch({ type: 'CLICK_CELL', index })}
        />
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
        onStart={() => dispatch({ type: state.phase === 'menu' ? 'START_GAME' : 'NEW_GAME' })}
        onSubmit={() => dispatch({ type: 'SUBMIT_MOVE' })}
        onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
      />
      <ScorePanel playerWords={state.playerWords} botWords={state.botWords} />
      {state.phase === 'letter' && (
        <Keyboard
          onLetter={(char) => dispatch({ type: 'SET_LETTER', char })}
          onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
        />
      )}
    </div>
  );
}
