import { useEffect, useReducer, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { EndPanel } from './components/EndPanel';
import { HistoryModal } from './components/HistoryModal';
import { Keyboard } from './components/Keyboard';
import { NewGameModal } from './components/NewGameModal';
import { RulesModal } from './components/RulesModal';
import { ScorePanel } from './components/ScorePanel';
import { SettingsModal } from './components/SettingsModal';
import { StatusBar } from './components/StatusBar';
import { WordPopup } from './components/WordPopup';
import { alphabetFor, type Lang } from './game/lang';
import { MAX_WORDS } from './game/constants';
import { findBestMove } from './game/finder';
import { cellClickActs, gameReducer } from './state/gameReducer';
import { initGame, saveGame } from './state/persist';
import { addGame, entryToState, type HistoryEntry } from './state/history';
import { wordFromTrack } from './state/helpers';
import { tap } from './haptics';
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

// how long a tapped word's track stays on the board after its translation
// popup closes
const SHOWN_TRACK_LINGER_MS = 3000;

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
  // the game history modal (the footer clock button)
  const [historyOpen, setHistoryOpen] = useState(false);
  // the new-game modal (the footer plus button): the language and difficulty
  // of the game its start button begins
  const [newGameOpen, setNewGameOpen] = useState(false);
  // the settings modal (the footer gear button): the board themes
  const [settingsOpen, setSettingsOpen] = useState(false);
  // the end panel is dismissible (its ✕ / Escape): the flag follows the
  // finished game it belongs to — a fresh 'over' phase reopens it, so it
  // starts from whether the restored save is already finished
  const [endPanelOpen, setEndPanelOpen] = useState(state.phase === 'over');
  // an english word tapped for its translation (WordPopup); null = closed
  const [wordPopup, setWordPopup] = useState<string | null>(null);
  // the path of a word tapped in a score list or the status line, laid back
  // on the board with the word's letter order (state.tracks); null = none.
  // It stays on the board for a few seconds after the popup closes (see
  // closeWordPopup) and any game action clears it right away (the effect
  // below)
  const [shownTrack, setShownTrack] = useState<number[] | null>(null);
  // the pending SHOWN_TRACK_LINGER_MS countdown of the popup just closed
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // the shown path belongs to the moment of the tap: any game action — a new
  // move, a restart, a language switch — produces a new state object and
  // clears it; the lingering countdown has nothing left to clear
  useEffect(() => {
    setShownTrack(null);
    clearTrackTimer();
  }, [state]);

  // a haptic tick per letter joining the drawn word: the track grows only
  // when the reducer appends a cell to the path (the drag entering a new
  // board cell) — unwinding back over the path shrinks it and stays silent,
  // as does the reset on a submit, a letter move or a cancel
  const trackLenRef = useRef(state.track.length);
  useEffect(() => {
    if (state.track.length > trackLenRef.current)
      tap();
    trackLenRef.current = state.track.length;
  });

  // no stray countdown outlives the component
  useEffect(() => () => clearTrackTimer(), []);

  // each finished game gets its panel back: a closed ✕ dismisses only the
  // panel of the game it belonged to
  useEffect(() => {
    if (state.phase === 'over')
      setEndPanelOpen(true);
  }, [state.phase]);

  // each finished game lands in the history (state/history.ts): the effect
  // runs once per transition into 'over' — the computer's closing word
  // included. A game loaded back from the history re-fires this on its load,
  // and addGame's duplicate check keeps it from being archived twice (the
  // double effect run of StrictMode's dev mount is caught the same way)
  useEffect(() => {
    if (state.phase === 'over')
      addGame(state);
  }, [state.phase]);

  // the color theme: data-theme on <html> switches the CSS variable set, and
  // meta theme-color re-points the browser/OS chrome above the page — the
  // status bar of the installed standalone app on Android follows it live,
  // which the manifest's static theme_color alone cannot do. The meta ships
  // as light/dark media variants (see index.html — Chrome's dark-mode
  // standalone bug ignores a scheme-less tag), so every variant is rewritten
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', chromeColorFor(theme));
    });
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
  // letter); Escape closes the open keyboard, cancels the move, closes one of
  // the open overlays (the new-game and settings modals, the rules modal, the
  // history modal, the word popup) or the end panel. The word itself is
  // drawn with the mouse/touch and submitted by the drag release.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (newGameOpen) {
        if (e.key === 'Escape')
          setNewGameOpen(false);
        return;
      }
      if (settingsOpen) {
        if (e.key === 'Escape')
          setSettingsOpen(false);
        return;
      }
      if (rulesOpen) {
        if (e.key === 'Escape')
          setRulesOpen(false);
        return;
      }
      if (historyOpen) {
        if (e.key === 'Escape')
          setHistoryOpen(false);
        return;
      }
      if (wordPopup !== null) {
        if (e.key === 'Escape')
          closeWordPopup();
        return;
      }
      if (state.phase === 'over' && endPanelOpen) {
        if (e.key === 'Escape')
          setEndPanelOpen(false);
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
  }, [state.phase, state.selectedCell, state.lang, newGameOpen, settingsOpen, rulesOpen, historyOpen, wordPopup, endPanelOpen]);

  // the new-game modal's start: the chosen language begins a fresh game (the
  // two-tap confirmation for a game in progress lives in the modal, on the
  // start button itself)
  function startGame(next: Lang) {
    setNewGameOpen(false);
    setLang(next);
    dispatch({ type: 'NEW_GAME', lang: next });
  }

  // a game from the history replaces the current one outright: its board,
  // words and tracks come back as a finished game, and the UI language
  // follows the game's own (the texts with it) — the same pairing as
  // switchLang. The confirmation for a game in progress lives in the modal
  function loadHistoryGame(entry: HistoryEntry) {
    setLang(entry.lang);
    dispatch({ type: 'LOAD_GAME', game: entryToState(entry) });
    setHistoryOpen(false);
  }

  // a tapped word opens its translation popup (english words only — the
  // callers decide) and lays its saved track on the board; a new tap replaces
  // the shown track and restarts its countdown from scratch
  function handleWordClick(word: string) {
    clearTrackTimer();
    setWordPopup(word);
    setShownTrack(state.tracks[word] ?? null);
  }

  // closing the popup is not the end of the track's visit: it lingers on the
  // board for a few seconds, then clears itself — unless a game action (the
  // effect keyed on state) or another tap gets there first
  function closeWordPopup() {
    setWordPopup(null);
    clearTrackTimer();
    trackTimerRef.current = setTimeout(() => {
      trackTimerRef.current = null;
      setShownTrack(null);
    }, SHOWN_TRACK_LINGER_MS);
  }

  function clearTrackTimer() {
    if (trackTimerRef.current !== null) {
      clearTimeout(trackTimerRef.current);
      trackTimerRef.current = null;
    }
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
        onWordClick={handleWordClick}
      />
      <div className="board-wrap">
        <Board
          board={state.board}
          track={state.track}
          shownTrack={shownTrack}
          numChar={state.numChar}
          selectedCell={state.selectedCell}
          phase={state.phase}
          botMove={showBotMove ? lastBotMove : null}
          boardRef={boardRef}
          texts={texts}
          onCellClick={(index) => {
            // tick only on the taps the game acts on (cellClickActs in the
            // reducer lists the same conditions as CLICK_CELL)
            if (cellClickActs(state, index))
              tap();
            dispatch({ type: 'CLICK_CELL', index });
          }}
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
        {state.phase === 'over' && endPanelOpen && (
          <EndPanel
            playerScore={scoreOf(state.playerWords)}
            botScore={scoreOf(state.botWords)}
            texts={texts}
            onRestart={() => dispatch({ type: 'NEW_GAME' })}
            onClose={() => setEndPanelOpen(false)}
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
        onWordClick={handleWordClick}
      />
      {/* one centered row of icon+caption buttons — the standard mobile tab
          look: new game, history, help, settings; on phones the footer is
          pinned to the bottom edge in this shape */}
      <footer className="footer">
        <button
          type="button"
          className="footer-btn"
          onClick={() => setNewGameOpen(true)}
          title={texts.newGame.title}
          aria-label={texts.newGame.title}
        >
          <span className="footer-btn-icon" aria-hidden="true">
            {/* every icon is strokes in currentColor, so it follows the
                button's palette through every theme (an emoji cannot) */}
            <svg viewBox="0 0 16 16" width="20" height="20" focusable="false">
              <path d="M8 3.2v9.6M3.2 8h9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          {texts.footer.newGame}
        </button>
        <button
          type="button"
          className="footer-btn"
          onClick={() => setHistoryOpen(true)}
          title={texts.history.title}
          aria-label={texts.history.title}
        >
          <span className="footer-btn-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="20" height="20" focusable="false">
              <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 4.75V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          {texts.footer.history}
        </button>
        <button
          type="button"
          className="footer-btn"
          onClick={() => setRulesOpen(true)}
          title={texts.rules.title}
          aria-label={texts.rules.title}
        >
          <span className="footer-btn-icon" aria-hidden="true">?</span>
          {texts.footer.help}
        </button>
        <button
          type="button"
          className="footer-btn"
          onClick={() => setSettingsOpen(true)}
          title={texts.settings.title}
          aria-label={texts.settings.title}
        >
          <span className="footer-btn-icon" aria-hidden="true">
            {/* the gear: a ring with eight teeth and the hub hole */}
            <svg viewBox="0 0 16 16" width="20" height="20" focusable="false">
              <circle cx="8" cy="8" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="8" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M8 1.6v2.1M8 12.3v2.1M1.6 8h2.1M12.3 8h2.1M3.5 3.5L5 5M11 11l1.5 1.5M12.5 3.5L11 5M5 11l-1.5 1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {texts.footer.settings}
        </button>
      </footer>
      {newGameOpen && (
        <NewGameModal
          lang={lang}
          difficulty={difficulty}
          hasProgress={state.usedWords.length > 1}
          texts={texts}
          onDifficulty={setDifficulty}
          onStart={startGame}
          onClose={() => setNewGameOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          theme={theme}
          texts={texts}
          onChange={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {rulesOpen && <RulesModal texts={texts} onClose={() => setRulesOpen(false)} />}
      {historyOpen && (
        <HistoryModal
          lang={lang}
          needsConfirm={state.phase !== 'over' && state.usedWords.length > 1}
          texts={texts}
          onLoad={loadHistoryGame}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {wordPopup !== null && (
        <WordPopup word={wordPopup} texts={texts} onClose={closeWordPopup} />
      )}
    </div>
  );
}
