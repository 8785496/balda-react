import { useEffect, useReducer } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { EndPanel } from './components/EndPanel';
import { Keyboard } from './components/Keyboard';
import { ScorePanel } from './components/ScorePanel';
import { StatusBar } from './components/StatusBar';
import { ALPHABET } from './game/constants';
import { findBestMove } from './game/finder';
import { gameReducer, initialState } from './state/gameReducer';
import { wordFromTrack } from './state/helpers';

// счёт — сумма длин слов (по 1 очку за букву)
function scoreOf(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // ход компьютера: после успешного «Хода» игрока. setTimeout даёт UI
  // показать слово игрока и статус «Компьютер думает…» до начала перебора.
  useEffect(() => {
    if (state.phase !== 'bot')
      return;
    const timer = setTimeout(() => {
      const move = findBestMove(state.board, state.usedWords);
      dispatch({ type: 'BOT_MOVED', move });
    }, 50);
    return () => clearTimeout(timer);
  }, [state.phase, state.board, state.usedWords]);

  // физическая клавиатура: буква (ё → е) в фазе letter,
  // Escape — отмена, Enter в фазе word — «Ход»
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
