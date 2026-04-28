import type { AgentCompletionNotificationPayload, AppSettings, AppState } from "@shared/appTypes";
import { Notification, dialog, type BrowserWindow, type NativeImage } from "electron";

interface MainUserInteractionsDeps {
  getMainWindow: () => BrowserWindow | null;
  getAppSettings: () => AppSettings;
  getAppIcon: () => NativeImage;
  getSnapshot: () => AppState;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  compactStateForRenderer: (snapshot: AppState) => AppState;
  focusMainWindow: () => void;
  focusAgent: (agentId: string) => Promise<AppState>;
  onFocusAgentSnapshot: (snapshot: AppState) => void;
  onFocusAgentError: (error: unknown) => void;
  selectProject: (projectRoot: string) => Promise<AppState>;
  unmountRemoteWorkspace: (mountPoint: string) => Promise<void>;
}

export interface MainUserInteractionsController {
  showAgentCompletionNotification: (payload: AgentCompletionNotificationPayload) => Promise<void>;
  showProjectPicker: () => Promise<AppState>;
  showProjectPickerAtPath: (defaultPath: string, title?: string) => Promise<AppState>;
  chooseMountedProject: (mountPoint: string, host: string) => Promise<AppState>;
}

export function createMainUserInteractionsController({
  getMainWindow,
  getAppSettings,
  getAppIcon,
  getSnapshot,
  withSnapshot,
  compactStateForRenderer,
  focusMainWindow,
  focusAgent,
  onFocusAgentSnapshot,
  onFocusAgentError,
  selectProject,
  unmountRemoteWorkspace
}: MainUserInteractionsDeps): MainUserInteractionsController {
  const shouldShowAgentCompletionNotification = (): boolean => {
    const mainWindow = getMainWindow();
    return Boolean(
      getAppSettings().agentCompletionNotificationsEnabled &&
      Notification.isSupported() &&
      mainWindow &&
      !mainWindow.isDestroyed() &&
      !mainWindow.isFocused()
    );
  };

  const showAgentCompletionNotification = async (payload: AgentCompletionNotificationPayload): Promise<void> => {
    if (!shouldShowAgentCompletionNotification()) {
      return;
    }

    const notification = new Notification({
      title: payload.title,
      body: payload.body,
      icon: getAppIcon(),
      urgency: "normal"
    });

    notification.on("click", () => {
      focusMainWindow();
      void focusAgent(payload.agentId).then((snapshot: AppState) => {
        onFocusAgentSnapshot(snapshot);
      }).catch((error: unknown) => {
        onFocusAgentError(error);
      });
    });

    notification.show();
  };

  const showProjectPicker = async (): Promise<AppState> => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return compactStateForRenderer(getSnapshot());
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a project repository",
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return compactStateForRenderer(getSnapshot());
    }

    return withSnapshot(() => selectProject(result.filePaths[0]));
  };

  const showProjectPickerAtPath = async (defaultPath: string, title?: string): Promise<AppState> => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return compactStateForRenderer(getSnapshot());
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || "Choose a project repository",
      defaultPath,
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return compactStateForRenderer(getSnapshot());
    }

    return withSnapshot(() => selectProject(result.filePaths[0]));
  };

  const chooseMountedProject = async (mountPoint: string, host: string): Promise<AppState> => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return compactStateForRenderer(getSnapshot());
    }

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: `Choose a repository on ${host}`,
        defaultPath: mountPoint,
        properties: ["openDirectory"]
      });

      if (result.canceled || result.filePaths.length === 0) {
        await unmountRemoteWorkspace(mountPoint);
        return compactStateForRenderer(getSnapshot());
      }

      return withSnapshot(() => selectProject(result.filePaths[0]));
    } catch (error) {
      await unmountRemoteWorkspace(mountPoint);
      throw error;
    }
  };

  return {
    showAgentCompletionNotification,
    showProjectPicker,
    showProjectPickerAtPath,
    chooseMountedProject
  };
}
