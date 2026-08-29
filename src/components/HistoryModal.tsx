// The archive of finished games (state/history.ts) in a modal, opened by the
// footer clock button: newest first, each row showing the outcome, the final
// score, the language and when the game ended. A tap loads the game back onto
// the board — over a game in progress the first tap only arms the row (the
// «Заново»/language-switch confirmation pattern), the second one loads and
// the current game is lost. Closes on the ✕ button, a click on the backdrop
// or Escape (App.tsx).
import { useEffect, useState } from 'react';
import type { Lang } from '../game/lang';
import { LANGS } from '../lang';
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

// «29.08.2026, 14:32» — the date format of the UI language
function formatWhen(at: number, lang: Lang): string {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return (
    new Date(at).toLocaleDateString(locale) +
    ', ' +
    new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
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
                  <span className="history-main">
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
                  </span>
                  <span className="history-meta">
                    {LANGS.find((l) => l.id === game.lang)?.label ?? game.lang}
                    {' · '}
                    {formatWhen(game.at, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
