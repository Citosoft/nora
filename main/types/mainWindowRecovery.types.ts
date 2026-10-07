import type { BrowserWindow, RenderProcessGoneDetails } from "electron";

/** A renderer failure the user should be offered a way out of, independent of Electron's event shapes. */
export type MainWindowFailure =
  | { kind: "process-gone"; reason: RenderProcessGoneDetails["reason"]; exitCode: number }
  | { kind: "load-failed"; errorCode: number; errorDescription: string; url: string }
  | { kind: "unresponsive" };

export interface MainWindowFailurePrompt {
  message: string;
  detail: string;
  /** Primary action first; the response index maps onto `actions`. */
  actions: MainWindowRecoveryAction[];
}

export type MainWindowRecoveryAction = "reload" | "wait" | "quit";

export interface AttachMainWindowRecoveryOptions {
  window: BrowserWindow;
  /** True while the app is shutting down, when failures are expected and should not prompt. */
  isClosing: () => boolean;
  quit: () => void;
}
