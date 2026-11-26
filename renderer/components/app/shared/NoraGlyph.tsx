import type { NoraGlyphProps } from "@/components/app/types/noraGlyph.types";
import { cn } from "@/lib/utils";

/** Lit pixels of the Nora "N", by row, as column indexes on the app icon's 7×6 grid. */
const GLYPH_ROWS: readonly (readonly number[])[] = [
  [0, 1, 2, 5, 6],
  [0, 1, 2, 5, 6],
  [0, 1, 3, 5, 6],
  [0, 1, 3, 5, 6],
  [0, 1, 4, 5, 6],
  [0, 1, 4, 5, 6]
];

/** Same pixel size, gap and corner radius as the app icon, scaled to a 1-unit pitch. */
const PIXEL = 0.8;
const RADIUS = 0.1;

/**
 * The app icon's pixel "N" without its tile, drawn in `currentColor` so it follows the theme
 * (black on light, white on dark). Use it for in-app branding; the framed `AppMark` stays the
 * dock icon and Nora's own avatar.
 */
export function NoraGlyph({ className }: NoraGlyphProps) {
  return (
    <svg viewBox={`0 0 ${6 + PIXEL} ${GLYPH_ROWS.length - 1 + PIXEL}`} fill="currentColor" aria-hidden="true" focusable="false"
      className={cn("size-5 shrink-0 text-foreground", className)}>
      {GLYPH_ROWS.flatMap((columns, row) => columns.map((column) =>
        <rect key={`${row}:${column}`} x={column} y={row} width={PIXEL} height={PIXEL} rx={RADIUS} />))}
    </svg>
  );
}
