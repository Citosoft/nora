import type {
  AgentSkillInstallOutputEvent,
  AutoUpdateStatus,
  ForgeOAuthDevicePrompt,
  LocalTerminalState,
  VercelRuntimeLogStreamEvent
} from "@shared/appTypes";
import type {
  MainWindowNotifications,
  MainWindowNotificationsDeps
} from "@main/types/mainWindowNotifications.types";

export function createMainWindowNotifications({
  getMainWindow,
  getWindowState,
  workspaceLoadingTimingByProject
}: MainWindowNotificationsDeps): MainWindowNotifications {
  const sendNotification = <Payload>(channel: string, getPayload: () => Payload): void => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      const { webContents } = mainWindow;
      if (webContents.isDestroyed()) {
        return;
      }

      // Electron logs disposed-frame send failures internally, so catching send alone is insufficient.
      const frame = webContents.mainFrame;
      if (frame.isDestroyed() || frame.detached) {
        return;
      }
      frame.send(channel, getPayload());
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("Render frame was disposed before WebFrameMain could be accessed") ||
          error.message.includes("Object has been destroyed"))
      ) {
        return;
      }
      console.error(`Failed to notify renderer on ${channel}.`, error);
    }
  };

  const notifyWindowStateChanged = (): void => {
    sendNotification("window:state-changed", getWindowState);
  };

  const notifyAppClosingProgress = (payload: { detail: string; command: string | null }): void => {
    sendNotification("app:closing-progress", () => payload);
  };

  const notifyTerminalData = (sessionId: string, data: string): void => {
    sendNotification("terminal:data", () => ({ sessionId, data }));
  };

  const notifyLocalTerminalChanged = (state: LocalTerminalState | null): void => {
    sendNotification("local-terminal:changed", () => state);
  };

  const notifyRemoteMountOutput = (line: string): void => {
    sendNotification("remote-mount:output", () => ({ line }));
  };

  const notifyToolSkillInstallOutput = (payload: AgentSkillInstallOutputEvent): void => {
    sendNotification("tool-skill-install:output", () => payload);
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
    sendNotification("workspace:loading-progress", () => payload);
  };

  const notifyVercelRuntimeLogEvent = (payload: VercelRuntimeLogStreamEvent): void => {
    sendNotification("vercel-runtime-log:event", () => payload);
  };

  const notifyAutoUpdateStatus = (payload: AutoUpdateStatus): void => {
    sendNotification("auto-update:status", () => payload);
  };

  const notifyForgeOAuthDevicePrompt = (payload: ForgeOAuthDevicePrompt): void => {
    sendNotification("forge-oauth:device-prompt", () => payload);
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
