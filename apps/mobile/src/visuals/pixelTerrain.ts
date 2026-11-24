import type { PixelGrid, PixelTerrainShading } from "@/types/pixelField.types";

/** Cell geometry from the website's dot terrain: 7pt dots on an 11pt pitch with softly rounded corners. */
export const pixelCell = Object.freeze({ size: 7, gap: 4, pitch: 11, radius: 1.5 });

/** One full drift of the terrain. Every time term completes whole cycles in it, so the animation loops without a seam. */
export const terrainLoopMs = 120_000;

/** How fast the native renderer slides its repeating strip sideways, close to the website ridges' own drift. */
export const terrainSlidePointsPerSecond = 6;

export const defaultShading: PixelTerrainShading = Object.freeze({ intensity: 1, edgeFade: 0.18, bottomFade: 0 });

const TAU = Math.PI * 2;

/** Layered sines (cheap smooth noise) for one ridge line; `speeds` are whole cycles per loop. */
function ridge(x: number, phase: number, speeds: readonly [number, number, number]): number {
  return (
    Math.sin(x * 0.021 + TAU * phase * speeds[0]) * 0.32 +
    Math.sin(x * 0.047 + TAU * phase * speeds[1] + 1.7) * 0.2 +
    Math.sin(x * 0.11 + TAU * phase * speeds[2] + 4.1) * 0.08 +
    Math.sin(x * 0.006 + 0.6) * 0.4
  );
}

const farSpeeds = [2, -1, 3] as const;
const nearSpeeds = [3, -2, 4] as const;

/** Stable per-cell noise in [0, 1) for the ordered dither. */
export function cellHash(column: number, row: number): number {
  const s = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Opacity of one cell at `phase` (0–1 through the loop): two drifting ridges of lit cells, brightest along the ridge line,
 * dithering out below and fading at the edges. A port of the website hero's `DotTerrain`, in cells rather than pixels.
 */
export function terrainAlpha(column: number, row: number, grid: PixelGrid, phase: number, shading: PixelTerrainShading = defaultShading): number {
  const { pitch } = pixelCell;
  const width = grid.columns * pitch;
  const x = column * pitch;
  const far = ridge(x, phase, farSpeeds);
  const near = ridge(x + 900, phase, nearSpeeds);
  const sides = shading.edgeFade > 0 ? Math.min(1, Math.min(x, width - x - pitch) / (width * shading.edgeFade)) : 1;
  return shadeCell(cellHash(column, row), row, grid.rows, far, near, sides, shading);
}

/** The website's per-pixel frequencies of the ridge's sine layers, matched to whole cycles across a repeating strip. */
const layerFrequencies = [0.021, 0.047, 0.11, 0.006] as const;
const layerWeights = [0.32, 0.2, 0.08, 0.4] as const;
const layerOffsets = [0, 1.7, 4.1, 0.6] as const;

/** A ridge whose layers each complete whole cycles across `columns`, so the strip repeats with no seam. */
function tiledRidge(column: number, columns: number, offset: number): number {
  const theta = (TAU * column) / columns;
  const tileWidth = columns * pixelCell.pitch;
  let value = 0;
  layerFrequencies.forEach((frequency, index) => {
    const cycles = Math.max(1, Math.round((frequency * tileWidth) / TAU));
    value += Math.sin(cycles * theta + (layerOffsets[index] ?? 0) + offset) * (layerWeights[index] ?? 0);
  });
  return value;
}

/**
 * The same terrain as a strip that repeats every `grid.columns` columns (column `c` and `c + columns` match), for the native
 * renderer, which draws it once and slides it sideways. Side fades would slide with it, so only the bottom fade applies.
 */
export function tiledTerrainAlpha(column: number, row: number, grid: PixelGrid, shading: PixelTerrainShading = defaultShading): number {
  const wrapped = ((column % grid.columns) + grid.columns) % grid.columns;
  const far = tiledRidge(wrapped, grid.columns, 0);
  const near = tiledRidge(wrapped, grid.columns, 2.3);
  return shadeCell(cellHash(wrapped, row), row, grid.rows, far, near, 1, shading);
}

/** Shades one cell from its column's two ridge values: lit near each ridge line, dithering out below, faded at the edges. */
function shadeCell(noise: number, row: number, rows: number, farRidge: number, nearRidge: number, sides: number, shading: PixelTerrainShading): number {
  const { pitch } = pixelCell;
  const height = rows * pitch;
  const y = row * pitch;
  const far = height * (0.5 - farRidge * 0.12);
  const near = height * (0.7 - nearRidge * 0.12);
  const bottom = shading.bottomFade > 0 ? Math.min(1, (height - y - pitch) / (height * shading.bottomFade)) : 1;
  const edge = Math.min(sides, bottom);
  if (edge <= 0) return 0;
  const dFar = y - far;
  const dNear = y - near;
  let level = 0;
  if (dNear > 0) level = Math.max(0.7 - dNear / (height * 0.5), 0.12) + (dNear < pitch * 1.5 ? 0.45 : 0);
  else if (dFar > 0) level = Math.max(0.42 - dFar / (height * 0.45), 0.06) + (dFar < pitch * 1.5 ? 0.3 : 0);
  const lit = noise < level * 1.3;
  const alpha = (lit ? Math.min(level, 1) * 0.45 : 0.035) * edge * shading.intensity;
  return alpha < 0.01 ? 0 : Math.round(alpha * 100) / 100;
}

/** How many whole cells fit in a measured area. */
export function gridFor(width: number, height: number): PixelGrid {
  return { columns: Math.max(0, Math.ceil(width / pixelCell.pitch)), rows: Math.max(0, Math.ceil(height / pixelCell.pitch)) };
}
