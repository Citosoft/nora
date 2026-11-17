import type { DesktopLifecycleSettings } from "@shared/appTypes";
import type { WindowCloseBehavior, WindowCloseInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

/** Remote access needs the runtime to outlive the window, so it forces background mode on while enabled. */
export function isBackgroundModeEffective(settings: DesktopLifecycleSettings, remoteAccessEnabled: boolean): boolean {
  return settings.keepRunningInBackground || remoteAccessEnabled;
}

/**
 * macOS keeps a Dock icon, so a hidden window can always come back. Linux tray support cannot be detected reliably
 * (and Windows can fail to create one), so there the window is minimised instead whenever a hidden window could be
 * stranded.
 */
export function resolveWindowCloseBehavior({ backgroundModeEffective, platform, trayAvailable }: WindowCloseInput): WindowCloseBehavior {
  if (!backgroundModeEffective) return "shutdown";
  if (platform === "darwin") return "hide";
  if (platform === "linux") return "minimize";
  return trayAvailable ? "hide" : "minimize";
}

/** Closing the last window quits on Windows/Linux unless Nora keeps running in the background. */
export function shouldQuitWhenWindowsClosed(platform: NodeJS.Platform, backgroundModeEffective: boolean): boolean {
  return platform !== "darwin" && !backgroundModeEffective;
}

/** A login launch starts in the tray only when there is a background job to do; otherwise the user expects a window. */
export function shouldStartHidden(openedAtLogin: boolean, backgroundModeEffective: boolean): boolean {
  return openedAtLogin && backgroundModeEffective;
}
