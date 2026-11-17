import type { AgentSession, DesktopLifecycleSettings } from "@shared/appTypes";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RemoteAccessService } from "@main/types/remote-access/service.types";

/** Why the app is about to stop; each reason gets its own confirmation wording. */
export type QuitReason = "quit" | "update" | "relaunch";

/** What closing the main window does. */
export type WindowCloseBehavior =
  /** Today's behaviour: stop agents gracefully and destroy the window. */
  | "shutdown"
  /** Keep running in the tray/menu bar with the window hidden. */
  | "hide"
  /** Keep running with the window minimised, where a hidden window could not be brought back reliably. */
  | "minimize";

export interface WindowCloseInput {
  backgroundModeEffective: boolean;
  platform: NodeJS.Platform;
  /** Whether a tray/menu bar icon is currently showing. */
  trayAvailable: boolean;
}

export interface ActiveWorkInput {
  conversations: readonly Pick<ConversationSummary, "latestRun" | "queuedCount" | "pendingRequestCount">[];
  agents: readonly Pick<AgentSession, "isBusy">[];
}

export interface ActiveWorkCount {
  /** Native threads with a run in progress, queued messages or a pending approval/question. */
  conversations: number;
  /** Terminal agents that are working on a turn. */
  agents: number;
  total: number;
}

export interface QuitPrompt {
  message: string;
  detail: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface QuitConfirmationDeps {
  countActiveWork(): ActiveWorkCount;
  /** Resolves true when the user confirms. */
  showPrompt(prompt: QuitPrompt): Promise<boolean>;
  log(message: string, error?: unknown): void;
}

export type TrayActionId = "open" | "disable-remote-access" | "quit";

export type TrayMenuItem =
  | { kind: "action"; id: TrayActionId; label: string }
  | { kind: "status"; label: string }
  | { kind: "separator" };

export interface TrayHandle {
  setMenu(items: readonly TrayMenuItem[]): void;
  destroy(): void;
}

export interface TrayOptions {
  tooltip: string;
  onAction(id: TrayActionId): void;
}

/** Creates the OS tray/menu bar icon; throws when the platform cannot show one. */
export type TrayFactory = (options: TrayOptions) => TrayHandle;

/** Registers or removes Nora as a login item for the current OS user. */
export interface LoginItemAdapter {
  apply(openAtLogin: boolean): Promise<void>;
  /** Whether this process was started by the OS login item rather than by the user. */
  wasOpenedAtLogin(): boolean;
}

/** The parts of the main window lifecycle decisions need. */
export interface LifecycleWindow {
  isDestroyed(): boolean;
  isVisible(): boolean;
  isMinimized(): boolean;
  hide(): void;
  minimize(): void;
}

export interface DesktopLifecycleDeps {
  platform: NodeJS.Platform;
  readSettings(): DesktopLifecycleSettings;
  getRemoteAccess(): RemoteAccessService | null;
  getMainWindow(): LifecycleWindow | null;
  /** Shows and focuses the main window, creating it when none exists. */
  showMainWindow(): void;
  quit(): void;
  createTray: TrayFactory;
  loginItem: LoginItemAdapter;
  log(message: string, error?: unknown): void;
}

export interface DesktopLifecycle {
  /** Applies login-item state and creates the tray if needed; call once settings are loaded and before the first window. */
  start(): void;
  /** Subscribes to remote access changes so the tray and background mode follow them. */
  attachRemoteAccess(service: RemoteAccessService): void;
  /** Re-evaluates the tray and login item after app settings were saved. */
  settingsChanged(): void;
  isBackgroundModeEffective(): boolean;
  /**
   * Called from the window's `close` handler when Nora is not quitting. Returns true when the window was kept
   * (hidden or minimised) and the caller must not shut it down.
   */
  retainWindowOnClose(): boolean;
  /** Whether closing the last window should quit the app (non-macOS). */
  shouldQuitWhenWindowsClosed(): boolean;
  /** True once, for the first window, when Nora was launched at login and runs in the background. */
  takeStartHidden(): boolean;
  dispose(): void;
}
