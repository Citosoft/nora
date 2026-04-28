import {
  parseHardwareAccelerationEnabledFromSettings,
  resolveHardwareAccelerationEnabledAtStartup
} from "@main/hardwareAcceleration";
import assert from "node:assert/strict";
import test from "node:test";

test("parseHardwareAccelerationEnabledFromSettings defaults to enabled when payload is invalid", () => {
  assert.equal(parseHardwareAccelerationEnabledFromSettings("not-json"), true);
  assert.equal(parseHardwareAccelerationEnabledFromSettings("[]"), true);
  assert.equal(parseHardwareAccelerationEnabledFromSettings("{}"), true);
});

test("parseHardwareAccelerationEnabledFromSettings returns false when explicitly disabled", () => {
  assert.equal(
    parseHardwareAccelerationEnabledFromSettings(JSON.stringify({ hardwareAccelerationEnabled: false })),
    false
  );
});

test("resolveHardwareAccelerationEnabledAtStartup prefers env override", () => {
  const enabled = resolveHardwareAccelerationEnabledAtStartup(
    "/fake/path.json",
    { NORA_DISABLE_HARDWARE_ACCELERATION: "1" },
    () => JSON.stringify({ hardwareAccelerationEnabled: true })
  );

  assert.equal(enabled, false);
});

test("resolveHardwareAccelerationEnabledAtStartup reads saved settings when env override is absent", () => {
  const disabledBySettings = resolveHardwareAccelerationEnabledAtStartup(
    "/fake/path.json",
    {},
    () => JSON.stringify({ hardwareAccelerationEnabled: false })
  );
  const enabledBySettings = resolveHardwareAccelerationEnabledAtStartup(
    "/fake/path.json",
    {},
    () => JSON.stringify({ hardwareAccelerationEnabled: true })
  );

  assert.equal(disabledBySettings, false);
  assert.equal(enabledBySettings, true);
});

test("resolveHardwareAccelerationEnabledAtStartup defaults to enabled when reading settings fails", () => {
  const enabled = resolveHardwareAccelerationEnabledAtStartup(
    "/fake/path.json",
    {},
    () => {
      throw new Error("ENOENT");
    }
  );

  assert.equal(enabled, true);
});
