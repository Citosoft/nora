import type {
  AttachMainWindowRecoveryOptions,
  MainWindowFailure,
  MainWindowFailurePrompt,
  MainWindowRecoveryAction
} from "@main/types/mainWindowRecovery.types";
import { dialog } from "electron";

/** Chromium's ERR_ABORTED: a navigation superseded by another (e.g. a reload), not a real failure. */
const LOAD_ABORTED_ERROR_CODE = -3;

const ACTION_LABELS: Record<MainWindowRecoveryAction, string> = {
  reload: "Reload Window",
  wait: "Keep Waiting",
  quit: "Quit Nora"
};

/** Maps a renderer failure to the prompt to show, or null when it needs no user action. */
export function describeMainWindowFailure(failure: MainWindowFailure): MainWindowFailurePrompt | null {
  switch (failure.kind) {
    case "process-gone":
      if (failure.reason === "clean-exit") {
        return null;
      }
      return {
        message: "Nora's window stopped unexpectedly",
        detail: `The renderer process exited (${failure.reason}, code ${failure.exitCode}). Agents and terminals are still running; reload the window to reconnect.`,
        actions: ["reload", "quit"]
      };
    case "load-failed":
      if (failure.errorCode === LOAD_ABORTED_ERROR_CODE) {
        return null;
      }
      return {
        message: "Nora's window failed to load",
        detail: `${failure.errorDescription} (${failure.errorCode}) while loading ${failure.url}.`,
        actions: ["reload", "quit"]
      };
    case "unresponsive":
      return {
        message: "Nora's window is not responding",
        detail: "You can keep waiting for it to recover or reload the window. Agents and terminals keep running either way.",
        actions: ["wait", "reload", "quit"]
      };
  }
}

/**
 * Offers Reload/Quit when the main window's renderer crashes, fails to load, or hangs. Without
 * this the frameless window is left blank with no controls to recover from.
 */
export function attachMainWindowRecovery({ window, isClosing, quit }: AttachMainWindowRecoveryOptions): void {
  let openPrompt: { failure: MainWindowFailure; dismiss: AbortController } | null = null;

  const handleFailure = async (failure: MainWindowFailure): Promise<void> => {
    const prompt = describeMainWindowFailure(failure);
    if (!prompt || openPrompt || isClosing() || window.isDestroyed()) {
      return;
    }

    const dismiss = new AbortController();
    openPrompt = { failure, dismiss };
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: "error",
        message: prompt.message,
        detail: prompt.detail,
        buttons: prompt.actions.map((action) => ACTION_LABELS[action]),
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        signal: dismiss.signal
      });
      if (!dismiss.signal.aborted) {
        applyRecoveryAction(prompt.actions[response] ?? prompt.actions[0]);
      }
    } finally {
      openPrompt = null;
    }
  };

  const applyRecoveryAction = (action: MainWindowRecoveryAction): void => {
    if (window.isDestroyed()) {
      return;
    }
    switch (action) {
      case "reload":
        window.webContents.reload();
        return;
      case "wait":
        return;
      case "quit":
        quit();
        return;
    }
  };

  window.webContents.on("render-process-gone", (_event, details) => {
    void handleFailure({ kind: "process-gone", reason: details.reason, exitCode: details.exitCode });
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }
    void handleFailure({ kind: "load-failed", errorCode, errorDescription, url: validatedURL });
  });

  window.on("unresponsive", () => {
    void handleFailure({ kind: "unresponsive" });
  });

  // A hang that clears on its own should not leave a stale "not responding" prompt behind.
  window.on("responsive", () => {
    if (openPrompt?.failure.kind === "unresponsive") {
      openPrompt.dismiss.abort();
    }
  });
}
