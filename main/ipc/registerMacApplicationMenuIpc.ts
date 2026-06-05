import { buildMacApplicationMenuTemplate } from "@main/helpers/buildMacApplicationMenuTemplate";
import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import type { BrowserWindow } from "electron";
import { ipcMain, Menu } from "electron";

const defaultMacApplicationMenuPayload: MacApplicationMenuSyncPayload = {
  phase: "pre-launch",
  hasActiveWorkspace: false,
  canOpenProjectInIde: false,
  activeProjectRoot: null,
  preferredIde: null,
  idesOrderedForMenu: [],
  defaultIdeId: null,
  recentWorkspaces: []
};

function installMacApplicationMenu(getMainWindow: () => BrowserWindow | null, payload: MacApplicationMenuSyncPayload): void {
  const template = buildMacApplicationMenuTemplate(getMainWindow, payload);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function registerMacApplicationMenuIpc(getMainWindow: () => BrowserWindow | null): void {
  if (process.platform === "darwin") {
    installMacApplicationMenu(getMainWindow, defaultMacApplicationMenuPayload);
  }

  ipcMain.handle("app:sync-mac-application-menu", (_event, payload: MacApplicationMenuSyncPayload) => {
    if (process.platform !== "darwin") {
      return;
    }

    installMacApplicationMenu(getMainWindow, payload);
  });
}
