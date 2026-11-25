import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { COLOR_THEME_IDS, DEFAULT_COLOR_THEME_ID, isColorThemeId } from "@shared/appearance/colorThemes";
import { appearanceSchema } from "@shared/settings-sync/contracts";

test("recognizes only known theme ids", () => {
  assert.equal(isColorThemeId("ocean"), true);
  assert.equal(isColorThemeId(DEFAULT_COLOR_THEME_ID), true);
  for (const value of ["", "Ocean", "midnight", null, 3]) assert.equal(isColorThemeId(value), false);
});

test("every theme has a light and dark palette outside Tailwind layers", () => {
  const css = readFileSync(join(process.cwd(), "renderer/styles.css"), "utf8");
  const firstLayer = css.indexOf("@layer ");
  for (const id of COLOR_THEME_IDS) {
    for (const mode of ["light", "dark"]) {
      const at = css.indexOf(`[data-color-theme="${id}"][data-theme="${mode}"]`);
      assert.ok(at >= 0, `${id} ${mode} palette is missing`);
      // Tailwind drops layered rules it cannot match against content files, which removed these selectors.
      assert.ok(at < firstLayer, `${id} ${mode} palette must sit before any @layer block`);
    }
  }
  // Each palette names the swatch color its orb shows and the accent it uses while the accent setting is Theme.
  assert.equal(css.match(/--theme-swatch:/g)?.length, COLOR_THEME_IDS.length * 2);
  assert.equal(css.match(/--theme-accent:/g)?.length, COLOR_THEME_IDS.length * 2);
});

test("the synced appearance accepts every theme and rejects unknown ones", () => {
  const theme = appearanceSchema.shape.colorTheme;
  for (const id of COLOR_THEME_IDS) assert.equal(theme.safeParse(id).success, true);
  assert.equal(theme.safeParse("midnight").success, false);
});
