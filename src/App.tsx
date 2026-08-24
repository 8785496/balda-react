import { useEffect, useReducer, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { DifficultyPicker } from './components/DifficultyPicker';
import { EndPanel } from './components/EndPanel';
import { Keyboard } from './components/Keyboard';
import { LangPicker } from './components/LangPicker';
import { RulesModal } from './components/RulesModal';
import { ScorePanel } from './components/ScorePanel';
import { StatusBar } from './components/StatusBar';
import { ThemePicker } from './components/ThemePicker';
import { WordPopup } from './components/WordPopup';
import { alphabetFor, type Lang } from './game/lang';
import { MAX_WORDS } from './game/constants';
import { findBestMove } from './game/finder';
import { gameReducer } from './state/gameReducer';
import { initGame, saveGame } from './state/persist';
import { wordFromTrack } from './state/helpers';
import { chromeColorFor, loadTheme, saveTheme, type ThemeId } from './theme';
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

// the artificial pause before the computer's move lands: the search is
// near-instant early on, and without it the «Думаю…» badge flashes for a
// split second — unreadable, and its flip animation has no time to play
const BOT_TURN_DELAY_MS = 700;

export default function App() {
  // the game language: the reducer's state is created for it up front; the
  // footer switcher restarts the game when it changes. The initial state is
  // the game saved from the last visit when there is one (state/persist.ts) —
  // leaving the app (the phone's Back button closes an installed PWA outright)
  // must not cost the player their game
  const [lang, setLang] = useState<Lang>(loadLang);
  const [state, dispatch] = useReducer(gameReducer, lang, initGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(loadDifficulty);
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  const [rulesOpen, setRulesOpen] = useState(false);
  // an english word tapped for its translation (WordPopup); null = closed
  const [wordPopup, setWordPopup] = useState<string | null>(null);
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

  // the game itself: persisted after every move, so closing the app (or the
  // phone's Back button, which closes an installed PWA) resumes where the
  // player left off. Only the settled game is stored — the move in progress
  // is rolled back into the snapshot, see state/persist.ts. The state object
  // is a new one on every action, so this writes once per action; the drag
  // actions rewrite the same snapshot, which is cheap and always current.
  useEffect(() => {
    saveGame(state);
  }, [state]);

  // the color theme: data-theme on <html> switches the CSS variable set, and
  // meta theme-color re-points the browser/OS chrome above the page — the
  // status bar of the installed standalone app on Android follows it live,
  // which the manifest's static theme_color alone cannot do
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', chromeColorFor(theme));
    saveTheme(theme);
  }, [theme]);

  // the computer's turn: after the player's successful submit. The delay is
  // mostly artificial (BOT_TURN_DELAY_MS — it makes the turn change
  // readable); it also lets the browser paint the «Думаю…» badge before
  // the (blocking) search starts.
  useEffect(() => {
    if (state.phase !== 'bot')
      return;
    const timer = setTimeout(() => {
      // the scores drive the difficulty caps' easing: hard caps its longest
      // word at 5 letters when it would put the computer ahead of the player,
      // and easy/medium step their exact word length one letter down when it
      // would put the computer ahead
      const move = findBestMove(state.board, state.usedWords, state.lang, difficulty, {
        player: scoreOf(state.playerWords),
        bot: scoreOf(state.botWords),
      });
      dispatch({ type: 'BOT_MOVED', move });
    }, BOT_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.phase, state.board, state.usedWords, state.lang, difficulty, state.playerWords, state.botWords]);

  // the computer's move is visible: its word path (with the letters' order
  // numbers, like the player's own track) and the added letter stay
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

  // physical keyboard: a letter (ё → е) while the letter keyboard is open (the
  // letter phase, or the word phase with the panel reopened on the added
  // letter); Escape closes the open keyboard, cancels the move, closes the
  // rules modal or the word popup. The word itself is drawn with the
  // mouse/touch and submitted by the drag release.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (rulesOpen) {
        if (e.key === 'Escape')
          setRulesOpen(false);
        return;
      }
      if (wordPopup !== null) {
        if (e.key === 'Escape')
          setWordPopup(null);
        return;
      }
      const keyboardOpen = state.selectedCell !== null &&
        (state.phase === 'letter' || state.phase === 'word');
      if (keyboardOpen) {
        if (e.key === 'Escape') {
          // the open panel closes first; in the word phase the move itself
          // stays, waiting for a second Escape
          dispatch({ type: state.phase === 'word' ? 'CLOSE_KEYBOARD' : 'CANCEL_MOVE' });
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
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.selectedCell, state.lang, rulesOpen, wordPopup]);

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
        startWord={state.usedWords.length === 1 ? state.usedWords[0] : null}
        error={state.error}
        status={state.status}
        phase={state.phase}
        lang={state.lang}
        texts={texts}
        onWordClick={setWordPopup}
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
        {(state.phase === 'letter' || state.phase === 'word') && state.selectedCell !== null && (
          <Keyboard
            boardRef={boardRef}
            cellIndex={state.selectedCell}
            lang={state.lang}
            texts={texts}
            onLetter={(char) => dispatch({ type: 'SET_LETTER', char })}
            onClose={() => dispatch({ type: 'CLOSE_KEYBOARD' })}
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
        texts={texts}
        usedCount={state.usedWords.length}
        maxWords={MAX_WORDS}
        onRestart={() => dispatch({ type: 'NEW_GAME' })}
        onCancel={() => dispatch({ type: 'CANCEL_MOVE' })}
      />
      <ScorePanel
        playerWords={state.playerWords}
        botWords={state.botWords}
        lang={state.lang}
        texts={texts}
        onWordClick={setWordPopup}
      />
      {/* two rows: the game settings (language, difficulty), then the help
          button and the theme swatches — on phones the footer is pinned to
          the screen's bottom edge in this shape */}
      <footer className="footer">
        <div className="footer-row">
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
        </div>
        <div className="footer-row">
          <button
            type="button"
            className="rules-icon"
            onClick={() => setRulesOpen(true)}
            title={texts.rules.title}
            aria-label={texts.rules.title}
          >
            ?
          </button>
          <ThemePicker value={theme} texts={texts} onChange={setTheme} />
        </div>
      </footer>
      {rulesOpen && <RulesModal texts={texts} onClose={() => setRulesOpen(false)} />}
      {wordPopup !== null && (
        <WordPopup word={wordPopup} texts={texts} onClose={() => setWordPopup(null)} />
      )}
    </div>
  );
}
