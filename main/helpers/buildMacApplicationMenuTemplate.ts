import { APP_DOCS_URL } from "@shared/appMeta";
import type { MacApplicationMenuCommand, MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import { MAC_APPLICATION_MENU_COMMAND_CHANNEL } from "@shared/types/macApplicationMenu.types";
import type { KeybindingAcceleratorLookup } from "@main/types/keybindings/keybindings.types";
import type { KeybindingCommandId } from "@shared/types/keybindings/keybindings.types";
import type { BrowserWindow, MenuItemConstructorOptions } from "electron";
import { shell } from "electron";

function emitMenuCommand(getMainWindow: () => BrowserWindow | null, command: MacApplicationMenuCommand): void {
  const windowRef = getMainWindow();
  if (!windowRef || windowRef.isDestroyed()) {
    return;
  }

  windowRef.webContents.send(MAC_APPLICATION_MENU_COMMAND_CHANNEL, command);
}

export function buildMacApplicationMenuTemplate(
  getMainWindow: () => BrowserWindow | null,
  payload: MacApplicationMenuSyncPayload,
  acceleratorFor: KeybindingAcceleratorLookup
): MenuItemConstructorOptions[] {
  /**
   * Shows the user's chord beside the item without registering it: the renderer's shortcut listener stays
   * the only handler, so a chord never fires twice and edits apply without the menu owning key handling.
   */
  const shortcut = (commandId: KeybindingCommandId): Pick<MenuItemConstructorOptions, "accelerator" | "registerAccelerator"> => {
    const accelerator = acceleratorFor(commandId);
    return accelerator ? { accelerator, registerAccelerator: false } : {};
  };

  const workspacePathReady =
    payload.hasActiveWorkspace &&
    typeof payload.activeProjectRoot === "string" &&
    payload.activeProjectRoot.length > 0;
  const ideMenuEnabled = workspacePathReady && payload.canOpenProjectInIde && payload.idesOrderedForMenu.length > 0;

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Add Workspace",
      ...shortcut("open-add-workspace"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "add-workspace" });
      }
    },
    {
      label: "Add Remote Workspace",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "add-remote-workspace" });
      }
    }
  ];

  if (payload.hasActiveWorkspace) {
    fileSubmenu.push({ type: "separator" });
    if (ideMenuEnabled) {
      fileSubmenu.push({
        label: "Open in IDE",
        submenu: payload.idesOrderedForMenu.map((ide) => ({
          label: payload.defaultIdeId === ide.id ? `${ide.name} (Default)` : ide.name,
          click: () => {
            emitMenuCommand(getMainWindow, { kind: "open-in-ide", ideId: ide.id });
          }
        }))
      });
    }

    fileSubmenu.push(
      {
        label: "New Terminal",
        ...shortcut("open-create-terminal"),
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "new-terminal" });
        }
      },
      {
        label: "New Thread",
        ...shortcut("open-create-agent"),
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "new-agent" });
        }
      },
      {
        label: "New Browser",
        ...shortcut("open-workspace-browser"),
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "new-browser" });
        }
      },
      {
        label: "Refresh Workspace",
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "refresh-workspace" });
        }
      },
      {
        label: "Close Workspace",
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "close-workspace" });
        }
      }
    );
  }

  fileSubmenu.push(
    { type: "separator" },
    {
      label: "Open Recent",
      submenu:
        payload.recentWorkspaces.length === 0
          ? [{ label: "No recent workspaces", enabled: false }]
          : payload.recentWorkspaces.map((entry) => ({
              label: entry.name,
              click: () => {
                emitMenuCommand(getMainWindow, {
                  kind: "open-recent-workspace",
                  rootPath: entry.rootPath,
                  name: entry.name
                });
              }
            }))
    }
  );

  const viewSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Toggle Sidebar",
      ...shortcut("toggle-workspace-sidebar"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-workspace-sidebar" });
      }
    },
    {
      label: "Toggle Changes Sidebar",
      ...shortcut("toggle-changes-sidebar"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-changes-sidebar" });
      }
    },
    {
      label: "Toggle Local Terminal Dock",
      ...shortcut("toggle-local-terminal-dock"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-local-terminal-dock" });
      }
    },
    {
      label: "Focus Local Terminal Dock",
      ...shortcut("focus-local-terminal-dock"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-local-terminal-dock" });
      }
    },
    { type: "separator" },
    {
      label: "Previous Session Tab",
      ...shortcut("focus-previous-session-tab"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-previous-session-tab" });
      }
    },
    {
      label: "Next Session Tab",
      ...shortcut("focus-next-session-tab"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-next-session-tab" });
      }
    },
    // Native roles so these keep working when the renderer is broken and cannot handle menu commands.
    { type: "separator" },
    { role: "reload" },
    { role: "forceReload" },
    { role: "toggleDevTools" }
  ];

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Documentation",
      click: () => {
        void shell.openExternal(APP_DOCS_URL);
      }
    },
    {
      label: "Keyboard Shortcuts",
      ...shortcut("open-keyboard-shortcuts"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-keyboard-shortcuts" });
      }
    },
    {
      label: "Startup Dependencies",
      ...shortcut("open-startup-dependencies"),
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-startup-dependencies" });
      }
    },
    {
      label: "Resource Monitor",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-resource-monitor" });
      }
    },
    {
      label: "Submit Issue",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "submit-issue" });
      }
    },
    {
      label: "About",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-about" });
      }
    }
  ];

  return [
    { role: "appMenu" },
    { label: "File", submenu: fileSubmenu },
    { role: "editMenu" },
    { label: "View", submenu: viewSubmenu },
    { role: "windowMenu" },
    { label: "Help", submenu: helpSubmenu }
  ];
}
