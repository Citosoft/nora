import assert from "node:assert/strict";
import test from "node:test";
import { parseDesktopLifecycleSettings } from "@shared/desktop-lifecycle/settings";

test("lifecycle settings default off and validate each persisted field independently", () => {
  for (const value of [undefined, null, {}, [], false]) {
    assert.deepEqual(parseDesktopLifecycleSettings(value), { keepRunningInBackground: false, launchAtLogin: false });
  }
  assert.deepEqual(parseDesktopLifecycleSettings({ keepRunningInBackground: true, launchAtLogin: "invalid" }), { keepRunningInBackground: true, launchAtLogin: false });
  assert.deepEqual(parseDesktopLifecycleSettings({ keepRunningInBackground: false, launchAtLogin: true }), { keepRunningInBackground: false, launchAtLogin: true });
});
