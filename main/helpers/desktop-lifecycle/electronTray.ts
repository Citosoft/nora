import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from "electron";
import path from "node:path";
import type { TrayFactory, TrayMenuItem, TrayOptions } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/**
 * macOS menu bar icons are black-on-transparent template images the system tints for light and dark menu bars.
 * Electron picks the `@2x` sibling automatically on high-density displays.
 */
function trayIconPath(iconDirectory: string, platform: NodeJS.Platform): string {
  return path.join(iconDirectory, platform === "darwin" ? "trayTemplate.png" : "tray.png");
}

function toElectronMenu(items: readonly TrayMenuItem[], onAction: TrayOptions["onAction"]): MenuItemConstructorOptions[] {
  return items.map((item): MenuItemConstructorOptions => {
    switch (item.kind) {
      case "separator": return { type: "separator" };
      case "status": return { label: item.label, enabled: false };
      case "action": return { label: item.label, click: () => onAction(item.id) };
    }
  });
}

/** Thin Electron adaptor behind the pure tray menu; `iconDirectory` holds the generated tray icons (dist/renderer). */
export function createElectronTrayFactory(iconDirectory: string, platform: NodeJS.Platform): TrayFactory {
  return ({ tooltip, onAction }) => {
    const icon = nativeImage.createFromPath(trayIconPath(iconDirectory, platform));
    if (icon.isEmpty()) throw new Error(`Tray icon is missing from ${iconDirectory}.`);
    if (platform === "darwin") icon.setTemplateImage(true);
    const tray = new Tray(icon);
    tray.setToolTip(tooltip);
    // Windows and most Linux panels open the context menu on right click only; a left click opens Nora.
    if (platform !== "darwin") tray.on("click", () => onAction("open"));
    return {
      setMenu(items) {
        if (!tray.isDestroyed()) tray.setContextMenu(Menu.buildFromTemplate(toElectronMenu(items, onAction)));
      },
      destroy() {
        if (!tray.isDestroyed()) tray.destroy();
      }
    };
  };
}
