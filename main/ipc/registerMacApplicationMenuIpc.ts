import { buildMacApplicationMenuTemplate } from "@main/helpers/buildMacApplicationMenuTemplate";
import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import type { MacApplicationMenuIpcDeps } from "@main/types/keybindings/keybindings.types";
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

export function registerMacApplicationMenuIpc({ getMainWindow, keybindings }: MacApplicationMenuIpcDeps): void {
  let lastPayload = defaultMacApplicationMenuPayload;
  const install = (payload: MacApplicationMenuSyncPayload): void => {
    lastPayload = payload;
    const accelerators = new Map(keybindings.resolved().map((binding) => [binding.commandId, binding.accelerator]));
    const template = buildMacApplicationMenuTemplate(getMainWindow, payload, (commandId) => accelerators.get(commandId) ?? null);
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  };

  if (process.platform === "darwin") {
    install(defaultMacApplicationMenuPayload);
    keybindings.subscribe(() => install(lastPayload));
  }

  ipcMain.handle("app:sync-mac-application-menu", (_event, payload: MacApplicationMenuSyncPayload) => {
    if (process.platform !== "darwin") {
      return;
    }

    install(payload);
  });
}
