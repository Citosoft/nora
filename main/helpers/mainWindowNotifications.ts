import type {
  AgentSkillInstallOutputEvent,
  AutoUpdateStatus,
  ForgeOAuthDevicePrompt,
  LocalTerminalState,
  VercelRuntimeLogStreamEvent
} from "@shared/appTypes";
import type { BrowserWindow } from "electron";

interface MainWindowNotificationsDeps {
  getMainWindow: () => BrowserWindow | null;
  getWindowState: () => { isMaximized: boolean; platform: NodeJS.Platform };
  workspaceLoadingTimingByProject: Map<string, { startedAt: number; lastStepAt: number }>;
}

export interface MainWindowNotifications {
  notifyWindowStateChanged: () => void;
  notifyAppClosingProgress: (payload: { detail: string; command: string | null }) => void;
  notifyTerminalData: (sessionId: string, data: string) => void;
  notifyLocalTerminalChanged: (state: LocalTerminalState | null) => void;
  notifyRemoteMountOutput: (line: string) => void;
  notifyToolSkillInstallOutput: (payload: AgentSkillInstallOutputEvent) => void;
  notifyWorkspaceLoadingProgress: (payload: { projectId: string; detail: string; command: string | null }) => void;
  notifyVercelRuntimeLogEvent: (payload: VercelRuntimeLogStreamEvent) => void;
  notifyAutoUpdateStatus: (payload: AutoUpdateStatus) => void;
  notifyForgeOAuthDevicePrompt: (payload: ForgeOAuthDevicePrompt) => void;
}

export function createMainWindowNotifications({
  getMainWindow,
  getWindowState,
  workspaceLoadingTimingByProject
}: MainWindowNotificationsDeps): MainWindowNotifications {
  const notifyWindowStateChanged = (): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    const { webContents } = mainWindow;
    if (webContents.isDestroyed()) {
      return;
    }

    try {
      webContents.send("window:state-changed", getWindowState());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Render frame was disposed before WebFrameMain could be accessed")
      ) {
        return;
      }
      console.error("Failed to notify renderer about window state change.", error);
    }
  };

  const notifyAppClosingProgress = (payload: { detail: string; command: string | null }): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("app:closing-progress", payload);
  };

  const notifyTerminalData = (sessionId: string, data: string): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("terminal:data", { sessionId, data });
  };

  const notifyLocalTerminalChanged = (state: LocalTerminalState | null): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("local-terminal:changed", state);
  };

  const notifyRemoteMountOutput = (line: string): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("remote-mount:output", { line });
  };

  const notifyToolSkillInstallOutput = (payload: AgentSkillInstallOutputEvent): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("tool-skill-install:output", payload);
  };

  const notifyWorkspaceLoadingProgress = (payload: { projectId: string; detail: string; command: string | null }): void => {
    const now = Date.now();
    const timing = workspaceLoadingTimingByProject.get(payload.projectId);
    const nextTiming = timing || { startedAt: now, lastStepAt: now };
    const stepElapsedMs = now - nextTiming.lastStepAt;
    const totalElapsedMs = now - nextTiming.startedAt;
    workspaceLoadingTimingByProject.set(payload.projectId, {
      startedAt: nextTiming.startedAt,
      lastStepAt: now
    });
    console.log(
      `[workspace-loading] ${payload.projectId} | +${stepElapsedMs}ms | total=${totalElapsedMs}ms | ${payload.detail}${payload.command ? ` | ${payload.command}` : ""}`
    );
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("workspace:loading-progress", payload);
  };

  const notifyVercelRuntimeLogEvent = (payload: VercelRuntimeLogStreamEvent): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("vercel-runtime-log:event", payload);
  };

  const notifyAutoUpdateStatus = (payload: AutoUpdateStatus): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("auto-update:status", payload);
  };

  const notifyForgeOAuthDevicePrompt = (payload: ForgeOAuthDevicePrompt): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("forge-oauth:device-prompt", payload);
  };

  return {
    notifyWindowStateChanged,
    notifyAppClosingProgress,
    notifyTerminalData,
    notifyLocalTerminalChanged,
    notifyRemoteMountOutput,
    notifyToolSkillInstallOutput,
    notifyWorkspaceLoadingProgress,
    notifyVercelRuntimeLogEvent,
    notifyAutoUpdateStatus,
    notifyForgeOAuthDevicePrompt
  };
}
