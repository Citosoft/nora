import { chordMatchesInput, keyboardInputForChord } from "@shared/keybindings/chord";
import type { PlatformKeyChord } from "@shared/types/keybindings/keybindings.types";
import type { BrowserWindow } from "electron";

/**
 * macOS maps ⌘W to "close window" unless the renderer receives the key first. When the chord bound to
 * `close-active-session-tab` is pressed, prevent the native path and dispatch a synthetic keydown so the
 * renderer shortcut runs consistently.
 */
export function attachCloseSessionTabShortcutForwarding(window: BrowserWindow, closeTabChord: () => PlatformKeyChord | null): void {
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") {
      return;
    }
    const chord = closeTabChord();
    const keystroke = { key: input.key, code: input.code, metaKey: input.meta, ctrlKey: input.control, altKey: input.alt, shiftKey: input.shift };
    if (!chord || !chordMatchesInput(chord, keystroke)) {
      return;
    }
    event.preventDefault();
    const init = JSON.stringify({ ...keyboardInputForChord(chord), bubbles: true, cancelable: true });
    void window.webContents.executeJavaScript(`window.dispatchEvent(new KeyboardEvent("keydown",${init}));`);
  });
}
