import type { BrowserWindow } from "electron";

/**
 * macOS maps ⌘W to "close window" unless the renderer receives the key first.
 * Prevent the native path and dispatch a synthetic keydown so the renderer shortcut
 * (`close-active-session-tab`) runs consistently.
 */
export function attachCloseSessionTabShortcutForwarding(window: BrowserWindow): void {
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") {
      return;
    }
    if (input.alt || input.shift) {
      return;
    }
    if (input.key.toLowerCase() !== "w") {
      return;
    }
    const isDarwin = process.platform === "darwin";
    const isChord = isDarwin ? input.meta && !input.control : input.control && !input.meta;
    if (!isChord) {
      return;
    }
    event.preventDefault();
    const metaKey = isDarwin ? "true" : "false";
    const ctrlKey = isDarwin ? "false" : "true";
    void window.webContents.executeJavaScript(
      `window.dispatchEvent(new KeyboardEvent("keydown",{key:"w",code:"KeyW",metaKey:${metaKey},ctrlKey:${ctrlKey},bubbles:true,cancelable:true}));`
    );
  });
}
