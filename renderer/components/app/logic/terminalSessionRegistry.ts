import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import {
  getCachedTerminalViewportSize,
  setCachedTerminalViewportSize
} from "@/components/app/logic/terminalViewportSizeCache";
import type { PreservedTerminalSessionEntry } from "@/components/app/types/terminalSessionRegistry.types";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal, type ITheme } from "@xterm/xterm";

const terminalSessionRegistry = new Map<string, PreservedTerminalSessionEntry>();

function styleTerminalHelpers(mountElement: HTMLDivElement): void {
  const xtermRoot = mountElement.querySelector(".xterm");
  const helperTextarea = xtermRoot?.querySelector(".xterm-helper-textarea") as HTMLTextAreaElement | null;
  const charMeasure = xtermRoot?.querySelector(".xterm-char-measure-element") as HTMLElement | null;
  const helpers = xtermRoot?.querySelector(".xterm-helpers") as HTMLElement | null;

  if (helpers) {
    helpers.style.position = "absolute";
    helpers.style.left = "-9999px";
    helpers.style.top = "-9999px";
    helpers.style.opacity = "0";
    helpers.style.pointerEvents = "none";
  }

  if (helperTextarea) {
    helperTextarea.style.position = "absolute";
    helperTextarea.style.left = "-9999px";
    helperTextarea.style.top = "-9999px";
    helperTextarea.style.width = "0";
    helperTextarea.style.height = "0";
    helperTextarea.style.opacity = "0";
    helperTextarea.style.border = "0";
    helperTextarea.style.background = "transparent";
    helperTextarea.style.color = "transparent";
    helperTextarea.style.pointerEvents = "none";
  }

  if (charMeasure) {
    charMeasure.style.position = "absolute";
    charMeasure.style.left = "-9999px";
    charMeasure.style.top = "-9999px";
    charMeasure.style.visibility = "hidden";
    charMeasure.style.opacity = "0";
    charMeasure.style.pointerEvents = "none";
  }
}

function createPreservedTerminalSessionEntry(
  sessionId: string,
  theme: ITheme,
  fontFamily: string
): PreservedTerminalSessionEntry {
  const mountElement = document.createElement("div");
  mountElement.className = "h-full w-full overflow-hidden";

  const terminal = new XtermTerminal({
    cols: 120,
    convertEol: false,
    cursorBlink: true,
    disableStdin: false,
    fontFamily,
    fontSize: 12,
    lineHeight: 1.45,
    rows: 36,
    scrollback: 5000,
    theme
  });
  const fitAddon = new FitAddon();
  const runtimeState = { canSendInput: false };
  let attachedViewportElement: HTMLDivElement | null = null;
  let lastSize = getCachedTerminalViewportSize(sessionId) ?? { cols: 0, rows: 0 };

  terminal.loadAddon(fitAddon);
  terminal.open(mountElement);
  styleTerminalHelpers(mountElement);

  const entry: PreservedTerminalSessionEntry = {
    sessionId,
    terminal,
    liveEventCount: 0,
    lastAppliedResetVersion: null,
    attachToViewport: (viewportElement) => {
      if (attachedViewportElement === viewportElement) {
        return;
      }

      mountElement.remove();
      viewportElement.replaceChildren(mountElement);
      attachedViewportElement = viewportElement;
    },
    detachFromViewport: () => {
      mountElement.remove();
      attachedViewportElement = null;
    },
    updateCanSendInput: (canSendInput) => {
      runtimeState.canSendInput = canSendInput;
    },
    updatePresentation: (nextTheme, nextFontFamily) => {
      terminal.options.theme = nextTheme;
      terminal.options.fontFamily = nextFontFamily;
    },
    applySize: () => {
      if (!attachedViewportElement || !mountElement.isConnected) {
        return;
      }

      fitAddon.fit();

      if (terminal.cols !== lastSize.cols || terminal.rows !== lastSize.rows) {
        lastSize = { cols: terminal.cols, rows: terminal.rows };
        setCachedTerminalViewportSize(sessionId, lastSize);
        void noraTerminalClient.resizeTerminal(sessionId, terminal.cols, terminal.rows);
      }
    },
    dispose: () => {
      unsubscribe();
      entry.detachFromViewport();
      terminal.dispose();
      terminalSessionRegistry.delete(sessionId);
    }
  };

  terminal.attachCustomKeyEventHandler((event) => {
    const isCopy = event.type === "keydown" && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c";
    const isPaste = event.type === "keydown" && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "v";

    if (isCopy) {
      const selection = terminal.getSelection();
      if (selection) {
        void navigator.clipboard.writeText(selection);
      }
      return false;
    }

    if (isPaste) {
      void navigator.clipboard.readText().then((text) => {
        if (text && runtimeState.canSendInput) {
          void noraTerminalClient.sendTerminalInput(sessionId, text);
        }
      }).catch(() => {
        // ignore clipboard read failures
      });
      return false;
    }

    return true;
  });

  terminal.onData((data) => {
    if (!runtimeState.canSendInput) {
      return;
    }

    void noraTerminalClient.sendTerminalInput(sessionId, data);
  });

  const unsubscribe = noraTerminalClient.onTerminalData((payload) => {
    if (payload.sessionId !== sessionId) {
      return;
    }

    entry.liveEventCount += 1;
    terminal.write(payload.data);
  });

  return entry;
}

export function getPreservedTerminalSession(sessionId: string): PreservedTerminalSessionEntry | null {
  return terminalSessionRegistry.get(sessionId) ?? null;
}

export function getOrCreatePreservedTerminalSession(
  sessionId: string,
  theme: ITheme,
  fontFamily: string
): PreservedTerminalSessionEntry {
  const existing = terminalSessionRegistry.get(sessionId);
  if (existing) {
    existing.updatePresentation(theme, fontFamily);
    return existing;
  }

  const created = createPreservedTerminalSessionEntry(sessionId, theme, fontFamily);
  terminalSessionRegistry.set(sessionId, created);
  return created;
}

export function prunePreservedTerminalSessions(activeSessionIds: Iterable<string>): void {
  const activeIds = new Set(activeSessionIds);

  terminalSessionRegistry.forEach((entry, sessionId) => {
    if (!activeIds.has(sessionId)) {
      entry.dispose();
    }
  });
}
