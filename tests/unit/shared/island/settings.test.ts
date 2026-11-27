import assert from "node:assert/strict";
import test from "node:test";
import { ISLAND_SIZE_SCALE, parseNotchIslandSettings } from "@shared/island/settings";

test("island settings keep valid fields and default the rest", () => {
  for (const value of [undefined, null, [], "on"]) {
    assert.deepEqual(parseNotchIslandSettings(value), { enabled: true, alwaysShow: false, size: "notch" });
  }
  assert.deepEqual(parseNotchIslandSettings({ enabled: false, alwaysShow: "yes", size: "huge" }), { enabled: false, alwaysShow: false, size: "notch" });
  assert.deepEqual(parseNotchIslandSettings({ enabled: true, alwaysShow: true, size: "large" }), { enabled: true, alwaysShow: true, size: "large" });
});

test("no size is smaller than the notch", () => {
  assert.ok(Object.values(ISLAND_SIZE_SCALE).every((scale) => scale >= 1));
  assert.equal(ISLAND_SIZE_SCALE.notch, 1);
});
