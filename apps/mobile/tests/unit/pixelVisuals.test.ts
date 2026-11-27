import { describe, expect, it } from "vitest";
import { glyphCells, glyphSize, pixelGlyphs } from "@/visuals/pixelGlyphs";
import { defaultShading, gridFor, terrainAlpha, tiledTerrainAlpha } from "@/visuals/pixelTerrain";

const grid = { columns: 36, rows: 28 };

describe("terrainAlpha", () => {
  it("loops seamlessly: phase 0 and phase 1 draw the same field", () => {
    for (let column = 0; column < grid.columns; column += 3) {
      for (let row = 0; row < grid.rows; row += 3) {
        expect(terrainAlpha(column, row, grid, 1)).toBeCloseTo(terrainAlpha(column, row, grid, 0), 2);
      }
    }
  });

  it("stays within opacity bounds and scales with intensity", () => {
    for (let row = 0; row < grid.rows; row++) {
      const alpha = terrainAlpha(18, row, grid, 0.3);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(0.45);
      expect(terrainAlpha(18, row, grid, 0.3, { ...defaultShading, intensity: 0 })).toBe(0);
    }
  });

  it("fades out at the edges unless edge fade is off", () => {
    const column = 0;
    const lowerRows = Array.from({ length: 8 }, (_, index) => grid.rows - 1 - index);
    expect(lowerRows.every((row) => terrainAlpha(column, row, grid, 0) === 0)).toBe(true);
    expect(lowerRows.some((row) => terrainAlpha(column, row, grid, 0, { intensity: 1, edgeFade: 0, bottomFade: 0 }) > 0)).toBe(true);
  });

  it("is brighter in the lower ground than the sky", () => {
    const sum = (rows: number[]) => rows.reduce((total, row) => total + Array.from({ length: grid.columns }, (_, column) => terrainAlpha(column, row, grid, 0)).reduce((a, b) => a + b, 0), 0);
    expect(sum([22, 23, 24])).toBeGreaterThan(sum([1, 2, 3]));
  });
});

describe("bottom fade", () => {
  it("clears the last row so the ground melts into the page", () => {
    const shading = { intensity: 1, edgeFade: 0, bottomFade: 0.3 };
    expect(Array.from({ length: grid.columns }, (_, column) => terrainAlpha(column, grid.rows - 1, grid, 0, shading)).every((alpha) => alpha === 0)).toBe(true);
  });
});

describe("tiledTerrainAlpha", () => {
  it("repeats every grid width, so a sliding strip has no seam", () => {
    for (let column = 0; column < grid.columns; column++) {
      for (let row = 0; row < grid.rows; row += 2) {
        expect(tiledTerrainAlpha(column + grid.columns, row, grid)).toBe(tiledTerrainAlpha(column, row, grid));
        expect(tiledTerrainAlpha(column - grid.columns, row, grid)).toBe(tiledTerrainAlpha(column, row, grid));
      }
    }
  });

  it("keeps the terrain's shape: lit ground below, a near-empty sky above", () => {
    const sum = (rows: number[]) => rows.reduce((total, row) => total + Array.from({ length: grid.columns }, (_, column) => tiledTerrainAlpha(column, row, grid)).reduce((a, b) => a + b, 0), 0);
    expect(sum([22, 23, 24])).toBeGreaterThan(sum([1, 2, 3]) * 3);
  });
});

describe("gridFor", () => {
  it("covers the measured area in whole cells", () => {
    expect(gridFor(390, 300)).toEqual({ columns: 36, rows: 28 });
    expect(gridFor(0, 0)).toEqual({ columns: 0, rows: 0 });
  });
});

describe("pixel glyphs", () => {
  it("lists lit cells with a diagonal stagger", () => {
    const cells = glyphCells(["#.", ".#"]);
    expect(cells).toEqual([{ column: 0, row: 0, shape: "full", delayMs: 0 }, { column: 1, row: 1, shape: "full", delayMs: 56 }]);
  });

  it("reads the mark's diagonal as half-width cells", () => {
    expect(glyphCells(["<>"]).map((cell) => cell.shape)).toEqual(["left", "right"]);
  });

  it("keeps every bundled glyph rectangular", () => {
    for (const bitmap of Object.values(pixelGlyphs)) {
      const { columns } = glyphSize(bitmap);
      expect(bitmap.every((line) => line.length === columns)).toBe(true);
    }
  });
});
