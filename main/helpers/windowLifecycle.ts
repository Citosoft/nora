import { BrowserWindow } from "electron";
import fs from "node:fs";

export function getWindowState(mainWindow: BrowserWindow | null): { isMaximized: boolean; platform: NodeJS.Platform } {
  return {
    isMaximized: mainWindow?.isMaximized() ?? false,
    platform: process.platform
  };
}

export function focusMainWindow(mainWindow: BrowserWindow | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

export function attachWindowStateListeners(window: BrowserWindow, onStateChanged: () => void): void {
  window.on("maximize", onStateChanged);
  window.on("unmaximize", onStateChanged);
  window.on("enter-full-screen", onStateChanged);
  window.on("leave-full-screen", onStateChanged);
}

interface WatchRendererDistOptions {
  rendererDir: string;
  getMainWindow: () => BrowserWindow | null;
}

export function watchRendererDist({
  rendererDir,
  getMainWindow
}: WatchRendererDistOptions): () => void {
  let reloadTimer: NodeJS.Timeout | null = null;

  const scheduleReload = (): void => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }
      void mainWindow.webContents.reloadIgnoringCache();
    }, 120);
  };

  const watcher = fs.watch(rendererDir, (_eventType, fileName) => {
    const changed = typeof fileName === "string" ? fileName : "";
    if (!["bundle.js", "styles.css", "index.html"].includes(changed)) {
      return;
    }
    scheduleReload();
  });

  return () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }
    watcher.close();
  };
}

interface ShutdownMainWindowOptions {
  getMainWindow: () => BrowserWindow | null;
  getIsClosing: () => boolean;
  setIsClosing: (nextValue: boolean) => void;
  notifyAppClosingProgress: (payload: { detail: string; command: string | null }) => void;
  stopAllAgentsGracefully: (onProgress: (payload: { detail: string; command: string | null }) => void) => Promise<void>;
}

export async function shutdownMainWindow({
  getMainWindow,
  getIsClosing,
  setIsClosing,
  notifyAppClosingProgress,
  stopAllAgentsGracefully
}: ShutdownMainWindowOptions): Promise<void> {
  if (getIsClosing()) {
    return;
  }

  setIsClosing(true);
  try {
    notifyAppClosingProgress({
      detail: "Waiting for agents to shut down safely before exiting...",
      command: "interrupt -> exit"
    });
    await stopAllAgentsGracefully((payload) => {
      notifyAppClosingProgress(payload);
    });
  } catch (error) {
    console.error("Failed to stop agents gracefully before shutdown.", error);
  } finally {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  }
}
