import assert from "node:assert/strict";
import test from "node:test";
import { isBackgroundModeEffective, resolveWindowCloseBehavior, shouldQuitWhenWindowsClosed, shouldStartHidden } from "@main/helpers/desktop-lifecycle/backgroundMode";

test("background mode follows the preference or remote opt-in", () => {
  for (const preference of [false, true]) for (const remote of [false, true]) {
    assert.equal(isBackgroundModeEffective({ keepRunningInBackground: preference, launchAtLogin: false }, remote), preference || remote);
  }
});
test("close preserves default shutdown and uses safe platform fallbacks", () => {
  for (const platform of ["darwin", "win32", "linux"] as const) {
    assert.equal(resolveWindowCloseBehavior({ platform, backgroundModeEffective: false, trayAvailable: true }), "shutdown");
    assert.equal(shouldQuitWhenWindowsClosed(platform, false), platform !== "darwin");
    assert.equal(shouldQuitWhenWindowsClosed(platform, true), false);
    assert.equal(resolveWindowCloseBehavior({ platform, backgroundModeEffective: true, trayAvailable: true }), platform === "linux" ? "minimize" : "hide");
  }
  assert.equal(resolveWindowCloseBehavior({ platform: "win32", backgroundModeEffective: true, trayAvailable: false }), "minimize");
  assert.equal(shouldStartHidden(true, true), true);
  assert.equal(shouldStartHidden(true, false), false);
  assert.equal(shouldStartHidden(false, true), false);
});
