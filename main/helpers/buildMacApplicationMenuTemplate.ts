import { APP_DOCS_URL } from "@shared/appMeta";
import type { MacApplicationMenuCommand, MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import { MAC_APPLICATION_MENU_COMMAND_CHANNEL } from "@shared/types/macApplicationMenu.types";
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
  payload: MacApplicationMenuSyncPayload
): MenuItemConstructorOptions[] {
  const workspacePathReady =
    payload.hasActiveWorkspace &&
    typeof payload.activeProjectRoot === "string" &&
    payload.activeProjectRoot.length > 0;
  const ideMenuEnabled = workspacePathReady && payload.canOpenProjectInIde && payload.idesOrderedForMenu.length > 0;

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Add Workspace",
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
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "new-terminal" });
        }
      },
      {
        label: "New Agent",
        click: () => {
          emitMenuCommand(getMainWindow, { kind: "new-agent" });
        }
      },
      {
        label: "New Browser",
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
      label: "Toggle Workspace Sidebar",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-workspace-sidebar" });
      }
    },
    {
      label: "Toggle Changes Sidebar",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-changes-sidebar" });
      }
    },
    {
      label: "Toggle Local Terminal Dock",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "toggle-local-terminal-dock" });
      }
    },
    {
      label: "Focus Local Terminal Dock",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-local-terminal-dock" });
      }
    },
    { type: "separator" },
    {
      label: "Previous Session Tab",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-previous-session-tab" });
      }
    },
    {
      label: "Next Session Tab",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "focus-next-session-tab" });
      }
    }
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
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-keyboard-shortcuts" });
      }
    },
    {
      label: "Startup Dependencies",
      click: () => {
        emitMenuCommand(getMainWindow, { kind: "open-startup-dependencies" });
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
