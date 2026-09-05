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

// two consecutive taps closer than this in time and in place are the
// double-tap zoom gesture
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;

export function blockZoomGestures(): void {
  // iOS pinch: gesturestart fires once the second finger lands, before any
  // scaling is applied. Non-standard, WebKit only — hence the string names.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });

  // iOS double-tap zoom: the second touchend inside the window is the one to
  // cancel. Cancelling a touchend also cancels the click the browser would
  // synthesize from that tap (iOS and Android alike), so the check must be as
  // narrow as the browser's own: the second tap has to land on the spot of
  // the first. A quick tap elsewhere — a keyboard key and then a cell, a
  // wrong cell and then the right one — is two taps, and both must click.
  let lastTouchEnd = 0;
  let lastX = 0;
  let lastY = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0];
      if (t === undefined)
        return;
      const now = e.timeStamp;
      const near = Math.abs(t.clientX - lastX) <= DOUBLE_TAP_PX &&
        Math.abs(t.clientY - lastY) <= DOUBLE_TAP_PX;
      if (now - lastTouchEnd <= DOUBLE_TAP_MS && near)
        e.preventDefault();
      lastTouchEnd = now;
      lastX = t.clientX;
      lastY = t.clientY;
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
