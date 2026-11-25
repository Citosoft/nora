import assert from "node:assert/strict";
import test from "node:test";
import { ACCENT_COLOR_IDS, DEFAULT_ACCENT_COLOR, isAccentColor } from "@shared/appearance/accentColors";
import { appearanceSchema } from "@shared/settings-sync/contracts";

test("the accent follows the theme by default", () => {
  assert.equal(DEFAULT_ACCENT_COLOR, "theme");
});

test("recognizes the theme accent and every fixed accent, and nothing else", () => {
  for (const id of ACCENT_COLOR_IDS) assert.equal(isAccentColor(id), true);
  for (const value of ["", "Theme", "teal", null, 1]) assert.equal(isAccentColor(value), false);
});

test("the synced appearance accepts the theme accent", () => {
  assert.equal(appearanceSchema.shape.accentColor.safeParse("theme").success, true);
  assert.equal(appearanceSchema.shape.accentColor.safeParse("teal").success, false);
});
