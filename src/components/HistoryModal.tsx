// The archive of finished games (state/history.ts) in a modal, opened by the
// footer clock button: newest first, each row one line — the game's flag, the
// outcome, the final score and when the game ended; the outcome tints its row
// (green win, red loss, a draw stays neutral). A tap loads the game back
// onto the board — over a game in progress the first tap only arms the row
// (the «Заново»/language-switch confirmation pattern), the second one loads
// and the current game is lost. The row's ⋮ button opens a small actions
// menu anchored to the dots (a delete so far). Closes on the ✕ button, a
// click on the backdrop or Escape (App.tsx).
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Lang } from '../game/lang';
import type { HistoryEntry } from '../state/history';
import { listGames, removeGame } from '../state/history';
import type { Texts } from '../i18n';

// how long a row's load confirmation stays armed without the second tap
const ARM_MS = 3000;

// the ⋮ menu's offset from the dots and its estimated height (one action +
// the card's padding) — enough to decide opening below the dots or flipping
// above them at the viewport's bottom edge
const MENU_GAP = 4;
const MENU_EST_HEIGHT = 48;

interface HistoryModalProps {
  lang: Lang; // the UI language — the rows' dates follow it
  needsConfirm: boolean; // the current game is in progress: loading replaces it
  texts: Texts;
  onLoad: (entry: HistoryEntry) => void;
  onClose: () => void;
}

// score — the sum of word lengths (1 point per letter)
function scoreOf(words: string[]): number {
  let n = 0;
  for (let i = 0; i < words.length; i++)
    n += words[i].length;
  return n;
}

// «30.08.26» — the UI language's numeric date, short year
function formatWhen(at: number, lang: Lang): string {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return new Date(at).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

// the game's language as a small round flag — an inline svg, not an emoji:
// Windows renders no flag emoji at all (a plain "RU"/"GB" letter pair
// instead), while these draw everywhere and at 16px. The tricolor and the
// simplified Union Jack, clipped to the circle by .history-flag's
// border-radius (the svg's own overflow-hidden does not round it)
function LangFlag({ lang }: { lang: Lang }) {
  if (lang === 'ru') {
    return (
      <svg className="history-flag" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#ffffff" />
        <rect x="0" y="8" width="24" height="8" fill="#0039a6" />
        <rect x="0" y="16" width="24" height="8" fill="#d52b1e" />
      </svg>
    );
  }
  return (
    <svg className="history-flag" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#012169" />
      <path d="M0 0l24 24M24 0L0 24" stroke="#ffffff" strokeWidth="4.8" />
      <path d="M0 0l24 24M24 0L0 24" stroke="#c8102e" strokeWidth="2" />
      <path d="M12 0v24M0 12h24" stroke="#ffffff" strokeWidth="8" />
      <path d="M12 0v24M0 12h24" stroke="#c8102e" strokeWidth="4.4" />
    </svg>
  );
}

export function HistoryModal({ lang, needsConfirm, texts, onLoad, onClose }: HistoryModalProps) {
  const t = texts.history;
  // read on open; a removal re-reads, keeping the modal in step with the slot
  const [games, setGames] = useState(listGames);
  // the entry whose load is one tap from happening; null = none — identified
  // by `at`, the entry's identity, so a removal cannot re-point it at another
  const [armed, setArmed] = useState<number | null>(null);
  // the open ⋮ menu: the entry's `at`, plus the dots' viewport position for
  // the fixed-position menu (the card scrolls — an in-card menu would be
  // clipped by its overflow)
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (armed === null)
      return;
    const timer = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  // Escape with the menu open closes only the menu: the listener rides the
  // capture phase, ahead of App's bubble-phase window handler that would
  // otherwise close the whole modal
  useEffect(() => {
    if (menuAt === null)
      return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuAt(null);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menuAt]);

  function pick(at: number, entry: HistoryEntry) {
    if (!needsConfirm || armed === at) {
      onLoad(entry);
      return;
    }
    setArmed(at);
  }

  // places the menu next to the tapped dots: below them, or above when the
  // estimate would push it off the viewport's bottom edge
  function openMenu(e: MouseEvent<HTMLButtonElement>, at: number) {
    const r = e.currentTarget.getBoundingClientRect();
    const below = r.bottom + MENU_GAP;
    setMenuPos({
      top: below + MENU_EST_HEIGHT > window.innerHeight
        ? r.top - MENU_GAP - MENU_EST_HEIGHT
        : below,
      right: window.innerWidth - r.right,
    });
    setMenuAt(at);
  }

  function remove(at: number) {
    removeGame(at);
    setGames(listGames());
    setMenuAt(null);
  }

  return (
    <div className="substrate" onClick={onClose}>
      <div
        className="history-card"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(e) => e.stopPropagation()}
        // a menu left open under a scrolled card would hang in the wrong
        // place — the scroll is as good a way out as the backdrop
        onScroll={() => setMenuAt(null)}
      >
        <div className="history-head">
          <h2>{t.title}</h2>
          <button
            type="button"
            className="history-close"
            onClick={onClose}
            aria-label={t.close}
            autoFocus
          >
            ✕
          </button>
        </div>
        {games.length === 0 ? (
          <p className="history-none">{t.empty}</p>
        ) : (
          <div className="history-list">
            {games.map((game) => {
              const player = scoreOf(game.playerWords);
              const bot = scoreOf(game.botWords);
              const isArmed = armed === game.at;
              const outcome = player === bot ? 'draw' : player > bot ? 'win' : 'lose';
              return (
                <div
                  key={game.at}
                  className={
                    'history-row' +
                    // no win/lose class while armed: the confirmation's error
                    // tint must read alone
                    (isArmed ? ' armed' : outcome === 'draw' ? '' : ' ' + outcome)
                  }
                >
                  <button
                    type="button"
                    className="history-load"
                    onClick={() => pick(game.at, game)}
                    title={isArmed ? t.confirmTitle : t.load}
                  >
                    <LangFlag lang={game.lang} />
                    <span className="history-result">
                      {isArmed
                        ? t.confirm
                        : outcome === 'win'
                          ? t.win
                          : outcome === 'lose'
                            ? t.lose
                            : t.draw}
                    </span>
                    <span className="history-score">
                      {player}
                      <span className="history-score-sep">–</span>
                      {bot}
                    </span>
                    <span className="history-meta">{formatWhen(game.at, lang)}</span>
                  </button>
                  <button
                    type="button"
                    className="history-more"
                    onClick={(e) => openMenu(e, game.at)}
                    title={t.actions}
                    aria-label={t.actions}
                    aria-expanded={menuAt === game.at}
                  >
                    {/* three dots in currentColor — recolors with the theme,
                        the footer clock's reasoning */}
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                      <circle cx="8" cy="3.2" r="1.4" fill="currentColor" />
                      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                      <circle cx="8" cy="12.8" r="1.4" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {menuAt !== null && (
        <>
          {/* the click-away layer: closes the menu, and stopping the click
              here keeps the substrate's click from closing the whole modal */}
          <div
            className="history-menu-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAt(null);
            }}
          />
          <div
            className="history-menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="history-menu-item" onClick={() => remove(menuAt)}>
              {/* the trash, strokes in currentColor like every icon here */}
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                <path d="M2.5 4.5h11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M6 4.5V3.2c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7v1.3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M4.3 4.5l.7 9.1c0 .4.4.7.8.7h4.4c.4 0 .8-.3.8-.7l.7-9.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {t.remove}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
