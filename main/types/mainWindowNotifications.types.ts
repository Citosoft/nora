import type {
  AgentSkillInstallOutputEvent,
  AutoUpdateStatus,
  ForgeOAuthDevicePrompt,
  LocalTerminalState,
  VercelRuntimeLogStreamEvent
} from "@shared/appTypes";
import type { BrowserWindow, WebContents, WebFrameMain } from "electron";

export interface MainWindowNotificationTarget {
  isDestroyed: BrowserWindow["isDestroyed"];
  webContents: {
    isDestroyed: WebContents["isDestroyed"];
    mainFrame: Pick<WebFrameMain, "isDestroyed" | "detached" | "send">;
  };
}

export interface MainWindowNotificationsDeps {
  getMainWindow: () => MainWindowNotificationTarget | null;
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

