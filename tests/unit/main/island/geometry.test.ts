import assert from "node:assert/strict";
import test from "node:test";
import { ISLAND_WINDOW_SIZE, islandPlacement, islandPlacements } from "@main/helpers/island/geometry";
import type { IslandDisplay } from "@main/types/island/island.types";

const display = (overrides: Partial<IslandDisplay> & Pick<IslandDisplay, "bounds" | "workArea">): IslandDisplay =>
  ({ id: 1, internal: true, ...overrides });

test("a notched built-in display gets an island centred at the very top, sized to the measured menu bar", () => {
  // A 15" MacBook Air at its default scaling, as Electron reports it.
  const placement = islandPlacement(display({ bounds: { x: 0, y: 0, width: 1710, height: 1107 }, workArea: { x: 0, y: 34, width: 1710, height: 1008 } }));
  assert.deepEqual(placement, {
    displayId: 1,
    bounds: { x: Math.round((1710 - ISLAND_WINDOW_SIZE.width) / 2), y: 0, ...ISLAND_WINDOW_SIZE },
    geometry: { notchWidth: 209, notchHeight: 34 }
  });
});

test("the notch is still found from the aspect ratio when the menu bar auto-hides", () => {
  const placement = islandPlacement(display({ bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 0, width: 1512, height: 982 } }));
  assert.deepEqual(placement?.geometry, { notchWidth: 185, notchHeight: 32 });
});

test("16:10 built-in panels and external displays get no island", () => {
  assert.equal(islandPlacement(display({ bounds: { x: 0, y: 0, width: 1440, height: 900 }, workArea: { x: 0, y: 24, width: 1440, height: 876 } })), null);
  assert.equal(islandPlacement(display({ internal: false, bounds: { x: 1710, y: 0, width: 2560, height: 1440 },
    workArea: { x: 1710, y: 37, width: 2560, height: 1403 } })), null);
});

test("only notched displays among several get placements, positioned in their own coordinates", () => {
  const placements = islandPlacements([
    display({ id: 2, internal: false, bounds: { x: -2560, y: -200, width: 2560, height: 1440 }, workArea: { x: -2560, y: -176, width: 2560, height: 1416 } }),
    display({ id: 1, bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 32, width: 1512, height: 950 } })
  ]);
  assert.deepEqual(placements.map((placement) => [placement.displayId, placement.bounds.x, placement.bounds.y]), [[1, 436, 0]]);
});
