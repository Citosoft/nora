import path from "node:path";
import type { LoginItemAdapter } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { LoginItemAdapterDeps, WindowsLoginItemSettings } from "@main/types/desktop-lifecycle/loginItem.types";
import {
  HIDDEN_LAUNCH_ARG,
  LINUX_AUTOSTART_FILE_NAME,
  linuxAutostartDirectory,
  linuxAutostartEntry,
  linuxLaunchExecutable
} from "./linuxAutostart";

/**
 * Squirrel installs run Nora through `Update.exe`, which survives app updates; the login item must point there and
 * forward the hidden flag, and disabling must name the same path and arguments to match the registered entry.
 */
export function windowsLoginItemSettings(execPath: string, openAtLogin: boolean): WindowsLoginItemSettings {
  const exe = path.win32.basename(execPath);
  return {
    openAtLogin,
    path: path.win32.resolve(path.win32.dirname(execPath), "..", "Update.exe"),
    args: ["--processStart", `"${exe}"`, "--process-start-args", `"${HIDDEN_LAUNCH_ARG}"`]
  };
}

/** One adaptor over macOS/Windows login items and Linux XDG autostart. Development builds are never registered. */
export function createLoginItemAdapter(deps: LoginItemAdapterDeps): LoginItemAdapter {
  const autostartFile = (): string => path.posix.join(linuxAutostartDirectory(deps.env, deps.homeDirectory), LINUX_AUTOSTART_FILE_NAME);

  return {
    async apply(openAtLogin) {
      // An unpackaged build would register the bare Electron binary, which cannot start Nora.
      if (!deps.app.isPackaged) return;
      switch (deps.platform) {
        case "darwin":
          deps.app.setLoginItemSettings({ openAtLogin, args: [HIDDEN_LAUNCH_ARG] });
          return;
        case "win32":
          deps.app.setLoginItemSettings(windowsLoginItemSettings(deps.execPath, openAtLogin));
          return;
        case "linux": {
          const file = autostartFile();
          if (!openAtLogin) {
            await deps.fs.removeFile(file);
            return;
          }
          await deps.fs.mkdir(path.posix.dirname(file));
          await deps.fs.writeFile(file, linuxAutostartEntry(linuxLaunchExecutable(deps.env, deps.execPath)));
          return;
        }
        default:
          deps.log(`Launch at login is not supported on ${deps.platform}.`);
      }
    },
    wasOpenedAtLogin() {
      if (deps.platform === "darwin") return deps.app.getLoginItemSettings().wasOpenedAtLogin === true || deps.argv.includes(HIDDEN_LAUNCH_ARG);
      return deps.argv.includes(HIDDEN_LAUNCH_ARG);
    }
  };
}
