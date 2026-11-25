import type { DotTerrainCell, DotTerrainFrame, DotTerrainGlows, DotTerrainGrid, DotTerrainLook } from "@/components/app/types/dotTerrain.types";

// Kept in step with the withnora.run hero so the app and the website share one pixel language.
const CELL = 7;
const GAP = 4;
const PITCH = CELL + GAP;

/** Milliseconds between frames; ~10fps is plenty for a slow drift. */
export const DOT_TERRAIN_FRAME_INTERVAL_MS = 100;
/** How long a cell the cursor lit takes to fade out once the cursor leaves it. */
export const DOT_TERRAIN_GLOW_FADE_MS = 700;
const GLOW_PEAK_ALPHA = 0.85;
// Columns per row in a cell key; far wider than any realistic canvas.
const KEY_STRIDE = 100_000;

/** Cheap smooth noise from layered sines; good enough for a slow drifting terrain. */
function terrain(x: number, t: number): number {
  return (
    Math.sin(x * 0.021 + t * 0.12) * 0.32 +
    Math.sin(x * 0.047 - t * 0.08 + 1.7) * 0.2 +
    Math.sin(x * 0.11 + t * 0.21 + 4.1) * 0.08 +
    Math.sin(x * 0.006 + 0.6) * 0.4
  );
}

/** Stable per-cell pseudo-random value in [0, 1), used as an ordered dither threshold. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// The faint dots that fill the area between and above the ridges.
const FLOOR_ALPHA = 0.035;
const RIDGE_PEAK_ALPHA = 0.45;

/** Ridge opacity of one cell: two drifting ridges, brightest on the ridge line and dithering out below; 0 off the ridges. */
function ridgeAlpha(y: number, threshold: number, far: number, near: number, height: number): number {
  const dFar = y - far;
  const dNear = y - near;
  let level = 0;
  if (dNear > 0) level = Math.max(0.7 - dNear / (height * 0.5), 0.12) + (dNear < PITCH * 1.5 ? 0.45 : 0);
  else if (dFar > 0) level = Math.max(0.42 - dFar / (height * 0.45), 0.06) + (dFar < PITCH * 1.5 ? 0.3 : 0);
  return threshold < level * 1.3 ? Math.min(level, 1) * RIDGE_PEAK_ALPHA : 0;
}

/**
 * Final opacity of a cell given its ridge opacity. Only the ridges fade towards the side edges; the faint floor
 * spans the full width so it does not stop short of the pane's sides.
 */
export function dotTerrainCellOpacity(grid: DotTerrainGrid, column: number, row: number, ridge: number): number {
  return Math.max(ridge * grid.edges[column], FLOOR_ALPHA) * grid.visibility[column * grid.rows + row];
}

/** Visibility in [0, 1] outside a central oval: hidden inside 45% of its radius, fading in towards the rim. */
function clearingVisibility(x: number, y: number, width: number, height: number): number {
  const dx = (x - width * 0.5) / (width * 0.48);
  const dy = (y - height * 0.44) / (height * 0.42);
  return Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 0.45) / 0.55));
}

export function buildDotTerrainGrid(width: number, height: number, { intensity, clearing }: DotTerrainLook): DotTerrainGrid {
  const columns = Math.ceil(width / PITCH);
  const rows = Math.ceil(height / PITCH);
  const thresholds = new Float32Array(columns * rows);
  const visibility = new Float32Array(columns * rows);
  const edges = new Float32Array(columns);
  for (let column = 0; column < columns; column++) {
    const x = column * PITCH;
    edges[column] = Math.min(1, Math.max(0, Math.min(x, width - x)) / (width * 0.18));
    for (let row = 0; row < rows; row++) {
      const index = column * rows + row;
      thresholds[index] = hash(column, row);
      visibility[index] = intensity
        * (clearing ? clearingVisibility(x + CELL / 2, row * PITCH + CELL / 2, width, height) : 1);
    }
  }
  return { width, height, columns, rows, thresholds, visibility, edges };
}

const ALPHA_STEPS = 48;
const ALPHA_BUCKETS = Math.ceil(RIDGE_PEAK_ALPHA * ALPHA_STEPS) + 1;

/** The shared fill an opacity is drawn with; 0 means the cell is not drawn. */
export const dotTerrainAlphaBucket = (alpha: number): number => Math.round(alpha * ALPHA_STEPS);

/** The drift changes the ridge lines. Each opacity shares a single fill across all of its dots. */
export function drawDotTerrainFrame(context: CanvasRenderingContext2D, { grid, time, color }: DotTerrainFrame): void {
  const { width, height, columns, rows, thresholds } = grid;
  context.clearRect(0, 0, width, height);
  context.fillStyle = color;
  const paths = new Array<Path2D | undefined>(ALPHA_BUCKETS);
  for (let column = 0; column < columns; column++) {
    const x = column * PITCH;
    const far = height * (0.5 - terrain(x, time) * 0.12);
    const near = height * (0.7 - terrain(x + 900, time * 1.3) * 0.12);
    for (let row = 0; row < rows; row++) {
      const y = row * PITCH;
      const ridge = ridgeAlpha(y, thresholds[column * rows + row], far, near, height);
      const bucket = dotTerrainAlphaBucket(dotTerrainCellOpacity(grid, column, row, ridge));
      if (!bucket) continue;
      (paths[bucket] ??= new Path2D()).rect(x, y, CELL, CELL);
    }
  }
  paths.forEach((path, bucket) => {
    if (!path) return;
    context.globalAlpha = bucket / ALPHA_STEPS;
    context.fill(path);
  });
  context.globalAlpha = 1;
}

/** The cell under a point in CSS pixels, or null outside the area. A point in a gap counts as the cell to its top-left. */
export function dotTerrainCellAt(x: number, y: number, width: number, height: number): DotTerrainCell | null {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const column = Math.floor(x / PITCH);
  const row = Math.floor(y / PITCH);
  return { column, row };
}

export const dotTerrainCellKey = ({ column, row }: DotTerrainCell): number => row * KEY_STRIDE + column;

/** Glow strength in [0, 1]: full while lit, easing out over the fade window after. */
export function dotTerrainGlowLevel(now: number, litAt: number): number {
  const progress = (now - litAt) / DOT_TERRAIN_GLOW_FADE_MS;
  if (progress <= 0) return 1;
  if (progress >= 1) return 0;
  return (1 - progress) ** 2;
}

/** Draws the cursor's lit cells over a terrain frame and drops cells that have fully faded. */
export function drawDotTerrainGlows(context: CanvasRenderingContext2D, glows: DotTerrainGlows, now: number, color: string): void {
  context.fillStyle = color;
  for (const [key, litAt] of glows) {
    const level = dotTerrainGlowLevel(now, litAt);
    if (level <= 0) { glows.delete(key); continue; }
    const column = key % KEY_STRIDE;
    const row = Math.floor(key / KEY_STRIDE);
    context.globalAlpha = level * GLOW_PEAK_ALPHA;
    context.beginPath();
    context.roundRect(column * PITCH, row * PITCH, CELL, CELL, 1.5);
    context.fill();
  }
  context.globalAlpha = 1;
}
