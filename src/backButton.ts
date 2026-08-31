// The phone's Back button against the game's overlays — the rules and history
// modals, the word popup, the end panel and the floating letter keyboard. In
// the installed standalone app the hardware Back closes the app outright, so
// with anything open on top of the board it must peel that instead. One
// history entry is parked above the page for as long as any overlay is open
// (a marker in its state tells it apart): the Android Back and the browser's
// Back button/swipe fire popstate on it, and the popstate closes the topmost
// overlay rather than leaving the app. With no overlay open nothing is parked
// and the Back press falls through to the system — the app exits, and the
// game survives via state/persist.ts. One entry serves every stack depth: it
// stays parked until the last overlay closes, and a Back press always closes
// exactly the topmost one.

const MARK = 'baldaOverlay';

// a consume (history.back() over the parked entry) is in flight: the popstate
// it fires is ours to swallow, not a Back press. history.back() is
// asynchronous — until its popstate lands, the stale entry still reads as
// parked, so the flag also keeps the consume idempotent against StrictMode's
// double effect run
let swallow = 0;

function parked(): boolean {
  const s: unknown = history.state;
  return typeof s === 'object' && s !== null && MARK in s;
}

// Point the parked entry at the overlay state: App calls it after every
// render where "is any overlay open" changed. The first open pushes the
// entry; the last overlay closing through its own UI (✕, backdrop, Escape, a
// game action) consumes it, so a parked slot never makes the next Back press
// a silent no-op.
export function syncOverlayBack(open: boolean): void {
  if (open) {
    if (!parked())
      history.pushState({ [MARK]: true }, '');
  } else if (parked() && swallow === 0) {
    swallow += 1;
    history.back();
  }
}

// The popstate side: App supplies the closure that closes its topmost overlay
// (it reads the live flags through a ref, the listener is installed once).
// Returns the unlisten.
export function watchOverlayBack(closeTop: () => void): () => void {
  function onPopState() {
    if (swallow > 0) {
      swallow -= 1;
      return;
    }
    if (parked()) {
      // a parked entry reached without a close in App — only possible by
      // going Forward over a stale one in a browser tab: nothing is open,
      // just clean the marker
      history.replaceState(null, '');
      return;
    }
    closeTop();
  }
  window.addEventListener('popstate', onPopState);
  return () => window.removeEventListener('popstate', onPopState);
}
