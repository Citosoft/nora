import assert from "node:assert/strict";
import { test } from "node:test";
import { DOT_TERRAIN_GLOW_FADE_MS, dotTerrainCellAt, dotTerrainCellKey, dotTerrainGlowLevel } from "@/components/app/logic/dotTerrain";

test("the cursor maps to the cell it is over, counting a gap as the cell before it, and nothing outside the area", () => {
  assert.deepEqual(dotTerrainCellAt(0, 0, 200, 100), { column: 0, row: 0 });
  assert.deepEqual(dotTerrainCellAt(12, 23, 200, 100), { column: 1, row: 2 });
  assert.deepEqual(dotTerrainCellAt(9, 9, 200, 100), { column: 0, row: 0 });
  assert.equal(dotTerrainCellAt(-1, 10, 200, 100), null);
  assert.equal(dotTerrainCellAt(10, 100, 200, 100), null);
});

test("cell keys are unique per cell", () => {
  assert.notEqual(dotTerrainCellKey({ column: 1, row: 0 }), dotTerrainCellKey({ column: 0, row: 1 }));
});

test("a lit cell stays full while hovered, then eases out over the fade window", () => {
  assert.equal(dotTerrainGlowLevel(500, Number.POSITIVE_INFINITY), 1);
  assert.equal(dotTerrainGlowLevel(1000, 1000), 1);
  const halfway = dotTerrainGlowLevel(1000 + DOT_TERRAIN_GLOW_FADE_MS / 2, 1000);
  assert.ok(halfway > 0 && halfway < 0.5);
  assert.equal(dotTerrainGlowLevel(1000 + DOT_TERRAIN_GLOW_FADE_MS, 1000), 0);
});
