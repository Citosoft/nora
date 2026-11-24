import type { PixelBitmap } from "@/types/pixelField.types";

/** Bitmaps in the app icon's dot-matrix language, used as onboarding and splash artwork. */
export const pixelGlyphs = Object.freeze({
  /** The N from the app icon. */
  mark: ["###..##", "###..##", "##.#.##", "##.#.##", "##..###", "##..###"],
  chat: ["#########", "#.......#", "#.#.#.#.#", "#.......#", "#########", "..##.....", ".#......."],
  approve: ["........#", ".......##", "#.....##.", "##...##..", ".##.##...", "..###....", "...#....."],
  computer: [".#########.", ".#.......#.", ".#.#.#...#.", ".#.......#.", ".#########.", "###########"]
} satisfies Record<string, PixelBitmap>);

export interface GlyphCell {
  column: number;
  row: number;
  /** Delay before the cell pixels in, sweeping diagonally from the top left. */
  delayMs: number;
}

const staggerMs = 28;

/** The lit cells of a bitmap with their entrance delays. */
export function glyphCells(bitmap: PixelBitmap): GlyphCell[] {
  return bitmap.flatMap((line, row) => [...line].flatMap((char, column) => (char === "#" ? [{ column, row, delayMs: (row + column) * staggerMs }] : [])));
}

export function glyphSize(bitmap: PixelBitmap): { columns: number; rows: number } {
  return { columns: Math.max(0, ...bitmap.map((line) => line.length)), rows: bitmap.length };
}
