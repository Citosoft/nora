import { buildMacApplicationMenuTemplate } from "@main/helpers/buildMacApplicationMenuTemplate";
import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import type { BrowserWindow } from "electron";
import { ipcMain, Menu } from "electron";

export function registerMacApplicationMenuIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("app:sync-mac-application-menu", (_event, payload: MacApplicationMenuSyncPayload) => {
    if (process.platform !== "darwin") {
      return;
    }

    const template = buildMacApplicationMenuTemplate(getMainWindow, payload);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  });
}
