import { posix as path } from "node:path";

// XDG autostart paths are always POSIX, whatever platform builds or tests them.

/** Passed by every login item so a login launch can be told apart from the user opening Nora. */
export const HIDDEN_LAUNCH_ARG = "--hidden";
export const LINUX_AUTOSTART_FILE_NAME = "nora.desktop";

/** `$XDG_CONFIG_HOME/autostart`, falling back to `~/.config/autostart` per the XDG Base Directory spec. */
export function linuxAutostartDirectory(env: NodeJS.ProcessEnv, homeDirectory: string): string {
  const configHome = env.XDG_CONFIG_HOME?.trim();
  return path.join(configHome && path.isAbsolute(configHome) ? configHome : path.join(homeDirectory, ".config"), "autostart");
}

/** AppImages run from a temporary mount; the stable launcher is the AppImage file itself. */
export function linuxLaunchExecutable(env: NodeJS.ProcessEnv, execPath: string): string {
  const appImage = env.APPIMAGE?.trim();
  return appImage && path.isAbsolute(appImage) ? appImage : execPath;
}

/**
 * Quotes one `Exec` argument per the Desktop Entry spec. Reserved characters need double quotes, and inside them
 * `"`, `` ` ``, `$` and `\` take a backslash. The value's general string escaping is undone before quoting, so every
 * backslash is then doubled again (a literal backslash becomes four).
 */
export function quoteDesktopExecArgument(argument: string): string {
  const escapedPercent = argument.replaceAll("%", "%%");
  if (!/[\s"'\\><~|&;$*?#()`]/.test(escapedPercent)) return escapedPercent;
  const quoted = escapedPercent.replace(/(["`$\\])/g, "\\$1");
  return `"${quoted.replaceAll("\\", "\\\\")}"`;
}

export function linuxAutostartEntry(executable: string): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Nora",
    "Comment=Keep Nora running in the background",
    `Exec=${[executable, HIDDEN_LAUNCH_ARG].map(quoteDesktopExecArgument).join(" ")}`,
    "Icon=nora",
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    ""
  ].join("\n");
}
