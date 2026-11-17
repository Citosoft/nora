import assert from "node:assert/strict";
import test from "node:test";
import { createDesktopLifecycle } from "@main/helpers/desktop-lifecycle/desktopLifecycle";
import type { RemoteAccessService } from "@main/types/remote-access/service.types";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import type { TrayMenuItem, TrayActionId } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

function fixture(platform: NodeJS.Platform = "win32", failTray = false) {
  const settings = { keepRunningInBackground: false, launchAtLogin: false };
  let view: RemoteAccessView = { signedIn: true, enabled: false, status: { status: "disabled" }, runtime: null, webAppUrl: "https://app.withnora.run", pendingCleanup: false };
  let listener = (_view: RemoteAccessView): void => {};
  let onAction = (_action: TrayActionId): void => {};
  let visible = true;
  let minimized = false;
  let shown = 0;
  let destroyed = 0;
  let logs = 0;
  let menu: readonly TrayMenuItem[] = [];
  const login: boolean[] = [];
  const remote: RemoteAccessService = {
    async start() {}, async shutdown() {}, sessionChanged() {},
    view: () => view, isEnabled: () => view.enabled,
    subscribe: (next) => { listener = next; return () => { listener = () => {}; }; },
    async activity() { return []; }, async enable() { return view; }, async disable() { return view; },
    async retry() { return view; }, async rotate() { return view; }, async rename() { return view; }
  };
  const lifecycle = createDesktopLifecycle({ platform, readSettings: () => settings, getRemoteAccess: () => remote,
    getMainWindow: () => ({ isDestroyed: () => false, isVisible: () => visible, isMinimized: () => minimized,
      hide() { visible = false; }, minimize() { minimized = true; } }),
    showMainWindow() { shown += 1; visible = true; minimized = false; }, quit() {},
    createTray(options) { if (failTray) throw new Error("No tray"); onAction = options.onAction; return { setMenu(next) { menu = next; }, destroy() { destroyed += 1; } }; },
    loginItem: { async apply(enabled) { login.push(enabled); }, wasOpenedAtLogin: () => true }, log() { logs += 1; }
  });
  return { lifecycle, settings, login, action: (action: TrayActionId) => onAction(action),
    changeRemote(enabled: boolean) { view = { ...view, enabled, status: { status: enabled ? "connected" : "disabled" } }; listener(view); },
    remote, state: () => ({ visible, minimized, shown, destroyed, logs, menu }) };
}

test("remote changes force background retention and reveal the window when disabled", () => {
  const f = fixture(); f.lifecycle.attachRemoteAccess(f.remote); f.lifecycle.start();
  assert.equal(f.lifecycle.retainWindowOnClose(), false);
  f.changeRemote(true);
  assert.equal(f.lifecycle.isBackgroundModeEffective(), true);
  assert.equal(f.lifecycle.retainWindowOnClose(), true);
  assert.equal(f.state().visible, false);
  assert.equal(f.lifecycle.shouldQuitWhenWindowsClosed(), false);
  assert.deepEqual(f.state().menu[1], { kind: "status", label: "Remote access: Connected" });
  f.changeRemote(false);
  assert.equal(f.state().visible, true);
  assert.equal(f.state().shown, 1);
  assert.equal(f.state().destroyed, 1);
  f.lifecycle.dispose();
});
test("tray failure is logged once and leaves Windows minimized and login launch visible", () => {
  const f = fixture("win32", true); f.settings.keepRunningInBackground = true; f.lifecycle.start();
  assert.equal(f.lifecycle.takeStartHidden(), false);
  assert.equal(f.lifecycle.retainWindowOnClose(), true);
  f.lifecycle.settingsChanged();
  assert.equal(f.state().logs, 1);
  assert.equal(f.state().minimized, true);
});
test("login launch hides only the first window; tray Open reveals it; login changes apply in order", async () => {
  const f = fixture(); f.settings.keepRunningInBackground = true; f.lifecycle.start();
  assert.equal(f.lifecycle.takeStartHidden(), true);
  assert.equal(f.lifecycle.takeStartHidden(), false);
  f.action("open"); assert.equal(f.state().shown, 1);
  f.settings.launchAtLogin = true; f.lifecycle.settingsChanged();
  f.settings.launchAtLogin = false; f.lifecycle.settingsChanged();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(f.login, [false, true, false]);
});
