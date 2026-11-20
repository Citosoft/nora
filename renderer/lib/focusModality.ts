// Tracks whether the user is currently navigating focus with the keyboard.
// Focus-triggered UI (tooltips) should only react to keyboard navigation:
// dialogs and popovers move focus programmatically when they open or close,
// and that focus must not look like the user tabbing onto a control.

const KEYBOARD_NAVIGATION_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

let keyboardNavigating = false;
let listening = false;

function startListening(): void {
  if (listening || typeof document === "undefined") {
    return;
  }
  listening = true;
  document.addEventListener(
    "keydown",
    (event) => {
      // Shortcuts (e.g. Cmd+K opening a dialog) are not focus navigation.
      keyboardNavigating = KEYBOARD_NAVIGATION_KEYS.has(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey;
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    () => {
      keyboardNavigating = false;
    },
    true
  );
}

startListening();

export function isKeyboardFocusNavigation(): boolean {
  return keyboardNavigating;
}
