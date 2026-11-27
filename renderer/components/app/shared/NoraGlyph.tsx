import type { NoraGlyphProps } from "@/components/app/types/noraGlyph.types";
import { cn } from "@/lib/utils";

/** Lit cells of the pixel bot head, as [column, row] on the app icon's 7×6 grid: the outline, then the eyes. */
const GLYPH_CELLS: readonly (readonly [number, number])[] = [
  [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
  [0, 1], [6, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4],
  [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
  [2, 2], [2, 3], [4, 2], [4, 3]
];

/** Same pixel size, gap and corner radius as the app icon, scaled to a 1-unit pitch. */
const PIXEL = 0.8;
const RADIUS = 0.1;

/** The lighter two-step diagonal joining the eyes into an N: half-width pixels in column 3. */
const DIAGONAL_PIXELS = [{ x: 3.025, y: 2 }, { x: 3.425, y: 3 }] as const;
const DIAGONAL = { width: 0.35, radius: 0.075, opacity: 0.5 } as const;

/**
 * The app icon's pixel bot head without its tile, drawn in `currentColor` so it follows the theme
 * (black on light, white on dark). Use it for in-app branding; the framed `AppMark` stays the
 * dock icon and Nora's own avatar.
 */
export function NoraGlyph({ className }: NoraGlyphProps) {
  return (
    <svg viewBox={`0 0 ${6 + PIXEL} ${5 + PIXEL}`} fill="currentColor" aria-hidden="true" focusable="false"
      className={cn("size-5 shrink-0 text-foreground", className)}>
      {GLYPH_CELLS.map(([column, row]) =>
        <rect key={`${row}:${column}`} x={column} y={row} width={PIXEL} height={PIXEL} rx={RADIUS} />)}
      {DIAGONAL_PIXELS.map(({ x, y }) =>
        <rect key={`diagonal:${y}`} x={x} y={y} width={DIAGONAL.width} height={PIXEL} rx={DIAGONAL.radius} fillOpacity={DIAGONAL.opacity} />)}
    </svg>
  );
}
