/**
 * Geometry for Nora's mark, shared by every static icon: a pixel bot head whose two eyes are joined
 * by a lighter two-step diagonal so they read as an N. Matches withnora.run's `src/lib/nora-mark.ts`.
 * Measured in a 1024-unit square on a 7×6 grid (64-unit pixels, 80-unit pitch).
 */

export const MARK_COLORS = Object.freeze({ tile: "#0D1410", panel: "#121B16", pixel: "#F4F8F5" });

/** Where the 7×6 grid starts inside the 1024 tile, and the glyph's own size without the tile. */
const ORIGIN = Object.freeze({ x: 240, y: 280 });
export const GLYPH_SIZE = Object.freeze({ width: 544, height: 464 });

const PITCH = 80;
const CELL = 64;

/** Lit cells as [column, row]: the head outline, then the two tall eyes. */
const HEAD_CELLS = [
  [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
  [0, 1], [6, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
  [2, 2], [2, 3], [4, 2], [4, 3]
];

/** The N's diagonal: two half-width pixels stepping down between the eyes, in glyph coordinates. */
const DIAGONAL_PIXELS = [
  { x: 242, y: 160, width: 28, height: 64, rx: 6 },
  { x: 274, y: 240, width: 28, height: 64, rx: 6 }
];

/** Diagonal opacity at normal sizes, and the brighter value small renders need for it to survive. */
export const DIAGONAL_OPACITY = 0.5;
export const SMALL_DIAGONAL_OPACITY = 0.7;

function rect({ x, y, width, height, rx }, extra = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"${extra}/>`;
}

/** The lit pixels in glyph coordinates (origin at the grid's top-left cell). */
function glyphPixels(diagonalOpacity) {
  return [
    ...HEAD_CELLS.map(([column, row]) => rect({ x: column * PITCH, y: row * PITCH, width: CELL, height: CELL, rx: 8 })),
    ...DIAGONAL_PIXELS.map((pixel) => rect(pixel, ` fill-opacity="${diagonalOpacity}"`))
  ].join("");
}

/** The tileless glyph in a single colour, for menu bars, splash screens and in-app branding; `padding` is in glyph units. */
export function noraGlyphSvg({ color = MARK_COLORS.pixel, diagonalOpacity = DIAGONAL_OPACITY, padding = 0 } = {}) {
  const width = GLYPH_SIZE.width + padding * 2;
  const height = GLYPH_SIZE.height + padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${-padding} ${-padding} ${width} ${height}">` +
    `<g fill="${color}">${glyphPixels(diagonalOpacity)}</g></svg>\n`;
}

/**
 * The full app icon. `panel` draws the inner panel (drop it for favicon-sized renders); `radius` is the
 * tile's corner radius, where 0 gives the full-bleed square iOS and maskable web icons expect.
 */
export function noraMarkSvg({ panel = true, radius = 220, diagonalOpacity = DIAGONAL_OPACITY } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">` +
    `<rect width="1024" height="1024" rx="${radius}" fill="${MARK_COLORS.tile}"/>` +
    (panel ? `<rect x="176" y="176" width="672" height="672" rx="160" fill="${MARK_COLORS.panel}"/>` : "") +
    `<g fill="${MARK_COLORS.pixel}" transform="translate(${ORIGIN.x} ${ORIGIN.y})">${glyphPixels(diagonalOpacity)}</g></svg>\n`;
}
