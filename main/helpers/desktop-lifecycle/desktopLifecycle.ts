import type {
  DesktopLifecycle,
  DesktopLifecycleDeps,
  TrayActionId,
  TrayHandle
} from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { RemoteAccessService } from "@main/types/remote-access/service.types";
import {
  isBackgroundModeEffective,
  resolveWindowCloseBehavior,
  shouldQuitWhenWindowsClosed,
  shouldStartHidden
} from "./backgroundMode";
import { buildTrayMenu } from "./trayMenu";

/**
 * Owns what happens around the main window and the OS session: whether closing the window keeps Nora running,
 * the tray/menu bar icon, and the login item. Background mode follows the user's setting and remote access.
 */
export function createDesktopLifecycle(deps: DesktopLifecycleDeps): DesktopLifecycle {
  let started = false;
  let tray: TrayHandle | null = null;
  let trayFailureLogged = false;
  let backgroundMode = false;
  let startHidden = false;
  /** The window is out of sight because Nora put it there; it must come back if background mode ends. */
  let windowRetained = false;
  let appliedLaunchAtLogin: boolean | null = null;
  let loginItemUpdates = Promise.resolve();
  let unsubscribeRemoteAccess: (() => void) | null = null;

  const effective = (): boolean => isBackgroundModeEffective(deps.readSettings(), deps.getRemoteAccess()?.isEnabled() ?? false);

  const onTrayAction = (id: TrayActionId): void => {
    switch (id) {
      case "open":
        windowRetained = false;
        deps.showMainWindow();
        return;
      case "disable-remote-access": {
        const remoteAccess = deps.getRemoteAccess();
        void remoteAccess?.disable().catch((error: unknown) => deps.log("Remote access could not be disabled from the tray.", error));
        return;
      }
      case "quit":
        deps.quit();
        return;
    }
  };

  const syncTray = (): void => {
    if (!backgroundMode) {
      tray?.destroy();
      tray = null;
      return;
    }
    if (!tray) {
      try {
        tray = deps.createTray({ tooltip: "Nora", onAction: onTrayAction });
      } catch (error) {
        // Some Linux desktops have no tray; Nora keeps running and the window is minimised instead of hidden.
        if (!trayFailureLogged) deps.log("Could not create the tray icon; continuing without it.", error);
        trayFailureLogged = true;
        return;
      }
    }
    tray.setMenu(buildTrayMenu(deps.getRemoteAccess()?.view() ?? null));
  };

  const syncLoginItem = (): void => {
    const desired = deps.readSettings().launchAtLogin;
    if (desired === appliedLaunchAtLogin) return;
    appliedLaunchAtLogin = desired;
    loginItemUpdates = loginItemUpdates.then(() => deps.loginItem.apply(desired)).catch((error: unknown) => {
      if (appliedLaunchAtLogin === desired) appliedLaunchAtLogin = null;
      deps.log("Could not update the launch at login setting.", error);
    });
  };

  /** Without background mode nothing can bring a hidden window back, so show it (or reopen a closed one). */
  const revealRetainedWindow = (): void => {
    const window = deps.getMainWindow();
    const missing = !window || window.isDestroyed();
    if (!missing && !windowRetained) return;
    windowRetained = false;
    if (missing || !window.isVisible() || window.isMinimized()) deps.showMainWindow();
  };

  const refresh = (): void => {
    if (!started) return;
    const wasBackground = backgroundMode;
    backgroundMode = effective();
    syncTray();
    if (wasBackground && !backgroundMode) revealRetainedWindow();
  };

  return {
    start() {
      if (started) return;
      started = true;
      syncLoginItem();
      backgroundMode = effective();
      syncTray();
      startHidden = shouldStartHidden(deps.loginItem.wasOpenedAtLogin(), backgroundMode)
        && (deps.platform === "darwin" || tray !== null);
    },
    attachRemoteAccess(service: RemoteAccessService) {
      unsubscribeRemoteAccess?.();
      unsubscribeRemoteAccess = service.subscribe(() => refresh());
      refresh();
    },
    settingsChanged() {
      if (!started) return;
      syncLoginItem();
      refresh();
    },
    isBackgroundModeEffective: () => (started ? backgroundMode : effective()),
    retainWindowOnClose() {
      refresh();
      const behavior = resolveWindowCloseBehavior({ backgroundModeEffective: effective(), platform: deps.platform, trayAvailable: tray !== null });
      const window = deps.getMainWindow();
      if (behavior === "shutdown" || !window || window.isDestroyed()) return false;
      if (behavior === "hide") window.hide();
      else window.minimize();
      windowRetained = true;
      return true;
    },
    shouldQuitWhenWindowsClosed: () => shouldQuitWhenWindowsClosed(deps.platform, effective()),
    takeStartHidden() {
      const hidden = startHidden;
      startHidden = false;
      if (hidden) windowRetained = true;
      return hidden;
    },
    dispose() {
      unsubscribeRemoteAccess?.();
      unsubscribeRemoteAccess = null;
      tray?.destroy();
      tray = null;
      started = false;
    }
  };
}
