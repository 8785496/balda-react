// Haptic feedback: a short tick through the Vibration API. It exists on
// Android browsers (including the installed PWA) and needs a user gesture —
// every call site is a tap handler, so that holds. iOS Safari has no
// vibration API at all and desktop browsers ignore it: there the optional
// call quietly does nothing.
export function tap(ms = 10) {
  navigator.vibrate?.(ms);
}
