// Zoom suppression for the phone/PWA experience. The board is a drag surface
// and the phone layout is a fixed app shell that never scrolls, so a pinch or
// a double tap can only scale the app into a state the player cannot undo
// (there is no page to scroll back to a sane position).
//
// The viewport meta in index.html (maximum-scale=1, user-scalable=no) covers
// Android and the installed standalone app. iOS Safari has ignored those two
// since iOS 10 in a browser tab, and there is no declarative replacement —
// these listeners are the only route. All of them are passive: false, since
// preventDefault on a passive listener is a no-op.

// two consecutive taps closer than this are the double-tap zoom gesture
const DOUBLE_TAP_MS = 300;

export function blockZoomGestures(): void {
  // iOS pinch: gesturestart fires once the second finger lands, before any
  // scaling is applied. Non-standard, WebKit only — hence the string names.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });

  // iOS double-tap zoom: the second touchend inside the window is the one to
  // cancel. Cancelling touchend does not suppress the click that follows a
  // single tap, so buttons keep working; it only kills the zoom.
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = e.timeStamp;
      if (now - lastTouchEnd <= DOUBLE_TAP_MS)
        e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  // multi-touch anywhere in the app is never a game gesture: the word path is
  // drawn with one finger. Cancelling the extra touch also stops the pinch
  // before it starts on browsers without the gesture* events.
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1)
        e.preventDefault();
    },
    { passive: false },
  );

  // ctrl/⌘ + wheel is the desktop pinch-zoom of a trackpad — harmless in a
  // browser tab, but in the installed standalone app it scales the shell the
  // same way a phone pinch would
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey)
        e.preventDefault();
    },
    { passive: false },
  );
}
