import { createMainWindowNotifications } from "@main/helpers/mainWindowNotifications";
import type { MainWindowNotificationsDeps } from "@main/types/mainWindowNotifications.types";
import assert from "node:assert/strict";
import test, { mock } from "node:test";

function fixture() {
  const send = mock.fn<(channel: string, payload: object | string | null) => void>();
  const frame = { isDestroyed: () => false, detached: false, send };
  const webContents = { isDestroyed: () => false, mainFrame: frame };
  const window = { isDestroyed: () => false, webContents };
  const getWindowState = mock.fn<MainWindowNotificationsDeps["getWindowState"]>(() => ({
    isMaximized: true,
    platform: "linux"
  }));
  const deps: MainWindowNotificationsDeps = {
    getMainWindow: () => window,
    getWindowState,
    workspaceLoadingTimingByProject: new Map()
  };
  const notifications = createMainWindowNotifications(deps);
  return { send, frame, webContents, window, deps, notifications, getWindowState };
}

test("live renderer receives shutdown progress and terminal output on their original channels", () => {
  const f = fixture();
  const progress = { detail: "Stopping agents", command: "interrupt -> exit" };
  f.notifications.notifyAppClosingProgress(progress);
  f.notifications.notifyTerminalData("session", "final output");
  f.notifications.notifyLocalTerminalChanged(null);
  f.notifications.notifyWindowStateChanged();

  assert.deepEqual(f.send.mock.calls.map((call) => call.arguments), [
    ["app:closing-progress", progress],
    ["terminal:data", { sessionId: "session", data: "final output" }],
    ["local-terminal:changed", null],
    ["window:state-changed", { isMaximized: true, platform: "linux" }]
  ]);
});

test("shutdown notifications skip unavailable windows, contents and renderer frames", async (t) => {
  for (const unavailable of ["window-missing", "window-destroyed", "contents-destroyed", "frame-disposed", "frame-detached"]) {
    await t.test(unavailable, () => {
      const f = fixture();
      switch (unavailable) {
        case "window-missing": f.deps.getMainWindow = () => null; break;
        case "window-destroyed": f.window.isDestroyed = () => true; break;
        case "contents-destroyed": f.webContents.isDestroyed = () => true; break;
        case "frame-disposed": f.frame.isDestroyed = () => true; break;
        case "frame-detached": f.frame.detached = true; break;
      }
      const notifications = createMainWindowNotifications(f.deps);
      notifications.notifyAppClosingProgress({ detail: "Stopping agents", command: null });
      notifications.notifyTerminalData("session", "late output");
      notifications.notifyWindowStateChanged();

      assert.equal(f.send.mock.callCount(), 0);
      assert.equal(f.getWindowState.mock.callCount(), 0);
    });
  }
});

test("shutdown progress skips disposed frames and resumes delivery to a replacement frame", () => {
  const f = fixture();
  f.notifications.notifyAppClosingProgress({ detail: "Stopping agents", command: null });
  f.frame.isDestroyed = () => true;
  f.notifications.notifyAppClosingProgress({ detail: "Agents stopped", command: null });
  const replacementSend = mock.fn<(channel: string, payload: object | string | null) => void>();
  f.webContents.mainFrame = { isDestroyed: () => false, detached: false, send: replacementSend };
  f.notifications.notifyWindowStateChanged();

  assert.equal(f.send.mock.callCount(), 1);
  assert.equal(replacementSend.mock.callCount(), 1);
});

test("frame access during disposal is ignored without hiding unrelated notification failures", (t) => {
  const f = fixture();
  const errorLog = t.mock.method(console, "error", () => {});
  let frameError = new Error("Render frame was disposed before WebFrameMain could be accessed");
  Object.defineProperty(f.webContents, "mainFrame", { get: () => { throw frameError; } });

  f.notifications.notifyAppClosingProgress({ detail: "Stopping agents", command: null });
  frameError = new Error("Object has been destroyed");
  f.notifications.notifyAppClosingProgress({ detail: "Agents stopped", command: null });
  assert.equal(errorLog.mock.callCount(), 0);

  frameError = new Error("Unexpected frame access failure");
  f.notifications.notifyWindowStateChanged();
  assert.equal(errorLog.mock.callCount(), 1);
  assert.deepEqual(errorLog.mock.calls[0].arguments, [
    "Failed to notify renderer on window:state-changed.", frameError
  ]);
  assert.equal(f.send.mock.callCount(), 0);
});

test("workspace timing remains recorded after the renderer goes away", (t) => {
  const f = fixture();
  f.frame.isDestroyed = () => true;
  const log = t.mock.method(console, "log", () => {});
  f.notifications.notifyWorkspaceLoadingProgress({ projectId: "project", detail: "Loading files", command: null });

  assert.ok(f.deps.workspaceLoadingTimingByProject.has("project"));
  assert.equal(log.mock.callCount(), 1);
  assert.equal(f.send.mock.callCount(), 0);
});


test("task changes identify the owning project and skip disposed renderers", () => {
  const f = fixture();
  f.notifications.notifyWorkspaceTasksChanged("background-project");
  assert.deepEqual(f.send.mock.calls[0].arguments, ["workspace:tasks-changed", "background-project"]);
  f.frame.detached = true;
  f.notifications.notifyWorkspaceTasksChanged("background-project");
  assert.equal(f.send.mock.callCount(), 1);
});
