import { useEffect, useReducer, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { DifficultyPicker } from './components/DifficultyPicker';
import { EndPanel } from './components/EndPanel';
import { Keyboard } from './components/Keyboard';
import { LangPicker } from './components/LangPicker';
import { ScorePanel } from './components/ScorePanel';
import { StatusBar } from './components/StatusBar';
import { ThemePicker } from './components/ThemePicker';
import { alphabetFor, type Lang } from './game/lang';
import { MAX_WORDS } from './game/constants';
import { findBestMove } from './game/finder';
import { gameReducer, freshGame } from './state/gameReducer';
import { wordFromTrack } from './state/helpers';
import { loadTheme, saveTheme, type ThemeId } from './theme';
import { loadLang, saveLang } from './lang';
import { loadDifficulty, saveDifficulty, type Difficulty } from './difficulty';
import { TEXTS } from './i18n';

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
  // the game language: the reducer's state is created for it up front; the
  // footer switcher restarts the game when it changes
  const [lang, setLang] = useState<Lang>(loadLang);
  const [state, dispatch] = useReducer(gameReducer, lang, freshGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(loadDifficulty);
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  const texts = TEXTS[lang];
  // the board grid element: the floating letter keyboard anchors to its cells
  const boardRef = useRef<HTMLDivElement | null>(null);

  // the game language: persisted, plus the document reflects it
  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
    document.title = texts.title;
  }, [lang, texts]);

  // the bot difficulty: persisted, applies from the computer's next turn
  useEffect(() => {
    saveDifficulty(difficulty);
  }, [difficulty]);

  // the color theme: data-theme on <html> switches the CSS variable set
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  // the computer's turn: after the player's successful submit. setTimeout lets
  // the UI show the player's word and the "computer is thinking" status before
  // the search starts.
  useEffect(() => {
    if (state.phase !== 'bot')
      return;
    const timer = setTimeout(() => {
      const move = findBestMove(state.board, state.usedWords, state.lang, difficulty);
      dispatch({ type: 'BOT_MOVED', move });
    }, 50);
    return () => clearTimeout(timer);
  }, [state.phase, state.board, state.usedWords, state.lang, difficulty]);

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
        if (alphabetFor(state.lang).indexOf(ch) !== -1)
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
  }, [state.phase, state.lang]);

  // switching the language starts a new game in it (the confirmation for a
  // game in progress lives in the picker itself)
  function switchLang(next: Lang) {
    setLang(next);
    dispatch({ type: 'NEW_GAME', lang: next });
  }

  return (
    <div className="context">
      <StatusBar
        result={wordFromTrack(state.board, state.track)}
        error={state.error}
        status={state.status}
        phase={state.phase}
        texts={texts}
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
          texts={texts}
          onCellClick={(index) => dispatch({ type: 'CLICK_CELL', index })}
          onDragStartCell={(index) => dispatch({ type: 'DRAG_START', index })}
          onDragCell={(index) => dispatch({ type: 'DRAG_CELL', index })}
          onDragSubmit={() => dispatch({ type: 'SUBMIT_MOVE' })}
        />
        {state.phase === 'letter' && state.selectedCell !== null && (
          <Keyboard
            boardRef={boardRef}
            cellIndex={state.selectedCell}
            lang={state.lang}
            texts={texts}
            onLetter={(char) => dispatch({ type: 'SET_LETTER', char })}
            onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
          />
        )}
        {state.phase === 'over' && (
          <EndPanel
            playerScore={scoreOf(state.playerWords)}
            botScore={scoreOf(state.botWords)}
            texts={texts}
            onRestart={() => dispatch({ type: 'NEW_GAME' })}
          />
        )}
      </div>
      <Controls
        phase={state.phase}
        canSubmit={state.phase === 'word' && state.track.length > 0}
        texts={texts}
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
        texts={texts}
      />
      <footer className="footer">
        <a
          className="rules-icon"
          href={texts.rules.href}
          target="_blank"
          rel="noreferrer"
          title={texts.rules.title}
          aria-label={texts.rules.title}
        >
          ?
        </a>
        <LangPicker
          value={lang}
          hasProgress={state.usedWords.length > 1}
          texts={texts}
          onChange={switchLang}
        />
        <DifficultyPicker
          value={difficulty}
          texts={texts}
          onChange={setDifficulty}
        />
        <ThemePicker value={theme} texts={texts} onChange={setTheme} />
      </footer>
    </div>
  );
}
