import { BrowserWindow, screen } from "electron";
import { ISLAND_CHANNELS } from "@shared/island/channels";
import type { IslandView } from "@shared/types/island/island.types";
import type { IslandScreen, IslandWindowFactory, IslandWindowPaths } from "@main/types/island/island.types";

/**
 * A borderless, transparent panel above the menu bar. It never takes focus or activates Nora, and lets clicks
 * through to the menu bar until the page reports the pointer is on the island shape.
 */
export function createElectronIslandWindowFactory(paths: IslandWindowPaths): IslandWindowFactory {
  return (placement) => {
    const window = new BrowserWindow({
      ...placement.bounds, show: false, type: "panel", frame: false, transparent: true, backgroundColor: "#00000000",
      hasShadow: false, resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
      // Sits over the menu bar, which macOS would otherwise push a window below.
      enableLargerThanScreen: true, skipTaskbar: true, hiddenInMissionControl: true, focusable: false, acceptFirstMouse: true,
      webPreferences: { preload: paths.preload, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true }
    });
    window.setAlwaysOnTop(true, "status");
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false, skipTransformProcessType: true });
    window.setIgnoreMouseEvents(true, { forward: true });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());

    let loaded = false;
    let pending: IslandView | null = null;
    const send = (view: IslandView): void => {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(ISLAND_CHANNELS.view, view);
    };
    window.webContents.once("did-finish-load", () => {
      loaded = true;
      if (pending) send(pending);
      pending = null;
      if (!window.isDestroyed()) window.showInactive();
    });
    void window.loadFile(paths.html).catch((error: unknown) => console.error("The notch island page could not load", error));

    return {
      webContentsId: window.webContents.id,
      setBounds: (bounds) => { if (!window.isDestroyed()) window.setBounds(bounds); },
      showView: (view) => { if (loaded) send(view); else pending = view; },
      setInteractive: (interactive) => {
        if (window.isDestroyed()) return;
        if (interactive) window.setIgnoreMouseEvents(false);
        else window.setIgnoreMouseEvents(true, { forward: true });
      },
      destroy: () => { if (!window.isDestroyed()) window.destroy(); }
    };
  };
}

export function createElectronIslandScreen(): IslandScreen {
  return {
    getAllDisplays: () => screen.getAllDisplays(),
    onDisplaysChanged(listener) {
      screen.on("display-added", listener);
      screen.on("display-removed", listener);
      screen.on("display-metrics-changed", listener);
      return () => {
        screen.removeListener("display-added", listener);
        screen.removeListener("display-removed", listener);
        screen.removeListener("display-metrics-changed", listener);
      };
    }
  };
}
