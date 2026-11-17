import type { QuitReason } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

export interface AppShutdownDeps {
  /** Runs before shutdown begins; resolving false cancels the quit and keeps Nora running. */
  confirmQuit(reason: QuitReason): Promise<boolean>;
  shutdown(): Promise<void>;
  quit(): void;
  onFailure(message: string): void;
}

export interface AppQuitEvent {
  preventDefault(): void;
}

export interface AppShutdown {
  /** True from confirmed quit until the process exits. A quit awaiting confirmation is not yet quitting. */
  isQuitting(): boolean;
  /** Handles Electron's `before-quit`: confirms, shuts down once, then lets the final quit through. */
  beforeQuit(event: AppQuitEvent): void;
  /**
   * Quits for a reason other than a plain quit (installing an update, relaunching). After confirmation and shutdown
   * it calls `proceed` instead of the plain quit, so flows such as `quitAndInstall` run exactly once and unprompted.
   * Resolves false when the user cancelled or another quit is already under way.
   */
  request(reason: QuitReason, proceed: () => void): Promise<boolean>;
}
