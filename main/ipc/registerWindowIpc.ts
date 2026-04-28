import { ipcMain, type BrowserWindow } from "electron";

interface RegisterWindowIpcDeps {
  getMainWindow: () => BrowserWindow | null;
  getWindowState: () => { isMaximized: boolean; platform: NodeJS.Platform };
}

export function registerWindowIpc({ getMainWindow, getWindowState }: RegisterWindowIpcDeps): void {
  ipcMain.handle("window:minimize", () => {
    getMainWindow()?.minimize();
  });
  ipcMain.handle("window:send-enter", () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.focus();
    mainWindow.webContents.focus();
    mainWindow.webContents.sendInputEvent({
      type: "rawKeyDown",
      keyCode: "Enter"
    });
    mainWindow.webContents.sendInputEvent({
      type: "char",
      keyCode: "\r"
    });
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "Enter"
    });
    mainWindow.webContents.sendInputEvent({
      type: "keyUp",
      keyCode: "Enter"
    });
  });
  ipcMain.handle("window:toggle-maximize", () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return getWindowState();
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }

    return getWindowState();
  });
  ipcMain.handle("window:close", () => {
    getMainWindow()?.close();
  });
}
