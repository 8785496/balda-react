// The archive of finished games (state/history.ts) in a modal, opened by the
// footer clock button: newest first, each row one line — the game's flag, the
// outcome, the final score and when the game ended. A tap loads the game back
// onto the board — over a game in progress the first tap only arms the row
// (the «Заново»/language-switch confirmation pattern), the second one loads
// and the current game is lost. Closes on the ✕ button, a click on the
// backdrop or Escape (App.tsx).
import { useEffect, useState } from 'react';
import type { Lang } from '../game/lang';
import type { HistoryEntry } from '../state/history';
import { listGames } from '../state/history';
import type { Texts } from '../i18n';

// how long a row's load confirmation stays armed without the second tap
const ARM_MS = 3000;

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

// «30.08.26, 14:32» — the UI language's numeric date, short year, with the
// time the game ended
function formatWhen(at: number, lang: Lang): string {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return (
    new Date(at).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }) +
    ', ' +
    new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  );
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
  // read once per opening: the modal mounts anew each time the button opens
  // it, so a game just finished is already in the list
  const [games] = useState(listGames);
  // the index of the row whose load is one tap from happening; null = none
  const [armed, setArmed] = useState<number | null>(null);

  useEffect(() => {
    if (armed === null)
      return;
    const timer = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function pick(index: number, entry: HistoryEntry) {
    if (!needsConfirm || armed === index) {
      onLoad(entry);
      return;
    }
    setArmed(index);
  }

  return (
    <div className="substrate" onClick={onClose}>
      <div
        className="history-card"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(e) => e.stopPropagation()}
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
            {games.map((game, i) => {
              const player = scoreOf(game.playerWords);
              const bot = scoreOf(game.botWords);
              const isArmed = armed === i;
              return (
                <button
                  type="button"
                  key={i}
                  className={'history-row' + (isArmed ? ' armed' : '')}
                  onClick={() => pick(i, game)}
                  title={isArmed ? t.confirmTitle : t.load}
                >
                  <LangFlag lang={game.lang} />
                  <span className="history-result">
                    {isArmed
                      ? t.confirm
                      : player === bot
                        ? t.draw
                        : player > bot
                          ? t.win
                          : t.lose}
                  </span>
                  <span className="history-score">
                    {player}
                    <span className="history-score-sep">–</span>
                    {bot}
                  </span>
                  <span className="history-meta">{formatWhen(game.at, lang)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
