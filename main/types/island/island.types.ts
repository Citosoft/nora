import type { IpcMain, IpcMainInvokeEvent, Rectangle } from "electron";
import type { ActiveWorkCount, ActiveWorkInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { InboxHost } from "@main/types/inbox/inbox.types";
import type { IslandDemoResult, IslandDemoScenario, IslandGeometry, IslandTarget, IslandView, NotchIslandSettings } from "@shared/types/island/island.types";

/** The parts of an Electron display the island's placement depends on. */
export interface IslandDisplay {
  id: number;
  internal: boolean;
  bounds: Rectangle;
  workArea: Rectangle;
}

/** Where one display's island window goes and the notch it wraps; displays without a notch get none. */
export interface IslandPlacement {
  displayId: number;
  bounds: Rectangle;
  geometry: IslandGeometry;
}

/** One island window, as the runtime drives it; the Electron adaptor owns the real `BrowserWindow`. */
export interface IslandWindowHandle {
  readonly webContentsId: number;
  setBounds(bounds: Rectangle): void;
  /** Delivers the view now, or once the page has loaded. */
  showView(view: IslandView): void;
  /** Let clicks through to the menu bar (false) or take them (true). */
  setInteractive(interactive: boolean): void;
  destroy(): void;
}

/** Everything in a view except the display's geometry, which each window adds for itself. */
export type IslandContent = Omit<IslandView, "geometry">;

export type IslandWindowFactory = (placement: IslandPlacement) => IslandWindowHandle;

export interface IslandWindowPaths {
  /** The island's bundled preload (`dist/main/islandPreload.js`). */
  preload: string;
  /** The island's page (`dist/renderer/island.html`). */
  html: string;
}

export interface IslandScreen {
  getAllDisplays(): readonly IslandDisplay[];
  /** Calls back whenever displays are added, removed or change; returns an unsubscribe. */
  onDisplaysChanged(listener: () => void): () => void;
}

export interface IslandRuntimeDeps {
  /** Whether this platform can show the island at all (macOS). */
  supported: boolean;
  settings(): NotchIslandSettings;
  countActiveWork(): ActiveWorkCount;
  screen: IslandScreen;
  createWindow: IslandWindowFactory;
  /** Brings Nora forward and shows the target. */
  open(target: IslandTarget): void;
  openInbox(): void;
  openNora(): void;
  log(message: string, error?: unknown): void;
  /** Calls back whenever threads, runs or terminal agents may have changed; returns an unsubscribe. */
  watchWork(onChange: () => void): () => void;
  /** Delay that coalesces bursts of run events into one redraw. */
  refreshDelayMs: number;
  /** How long a demo shows before the island returns to real work. */
  demoDurationMs: number;
}

export interface IslandRuntime {
  /** Re-reads the settings and shows, resizes or removes the island now. */
  settingsChanged(): void;
  /** Whether `webContentsId` belongs to one of the island's windows. */
  ownsSender(webContentsId: number): boolean;
  setInteractive(webContentsId: number, interactive: boolean): void;
  open(target: IslandTarget): void;
  openInbox(): void;
  openNora(): void;
  /** Shows sample work for a short while, even with the setting off, without opening any real thread. */
  startDemo(scenario: IslandDemoScenario): IslandDemoResult;
  /** Ends a demo early; does nothing when none is showing. */
  stopDemo(): void;
  dispose(): void;
}

export interface IslandIpcDeps {
  ipc: Pick<IpcMain, "handle">;
  runtime: Pick<IslandRuntime, "ownsSender" | "setInteractive" | "open" | "openInbox" | "openNora" | "startDemo" | "stopDemo">;
  /** Whether the sender is the app's main window, the only one allowed to start a demo. */
  isAllowedSender(event: IpcMainInvokeEvent): boolean;
}

/** The part of an IPC event the island's handlers check. */
export type IslandIpcEvent = Pick<IpcMainInvokeEvent, "sender">;

/** What `startIsland` needs from the app; everything Electron-specific beyond windows stays in main.ts. */
export interface StartIslandDeps {
  settings(): NotchIslandSettings;
  host: Pick<InboxHost, "subscribe" | "eventCursor">;
  /** Threads and terminal agents as they are now; read lazily because the runtime starts before every service. */
  readWork(): ActiveWorkInput;
  /** Subscribes to terminal agent changes; returns an unsubscribe. */
  onAgentsChanged(listener: () => void): () => void;
  paths: IslandWindowPaths;
  openThread(conversationId: string): void;
  openTerminalAgent(agentId: string): void;
  openInbox(): void;
  openNora(): void;
}
