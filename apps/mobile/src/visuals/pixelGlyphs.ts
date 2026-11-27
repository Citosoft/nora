import type { GlyphCell, GlyphCellShape, PixelBitmap } from "@/types/pixelField.types";

/** Bitmaps in the app icon's dot-matrix language, used as onboarding and splash artwork. */
export const pixelGlyphs = Object.freeze({
  /** The app icon's pixel bot head, its eyes joined by a faint diagonal into an N. */
  mark: [".#####.", "#.....#", "#.#<#.#", "#.#>#.#", "#.....#", ".#####."],
  chat: ["#########", "#.......#", "#.#.#.#.#", "#.......#", "#########", "..##.....", ".#......."],
  approve: ["........#", ".......##", "#.....##.", "##...##..", ".##.##...", "..###....", "...#....."],
  computer: [".#########.", ".#.......#.", ".#.#.#...#.", ".#.......#.", ".#########.", "###########"]
} satisfies Record<string, PixelBitmap>);

const staggerMs = 28;

const shapeByChar: Readonly<Record<string, GlyphCellShape>> = { "#": "full", "<": "left", ">": "right" };

/** The lit cells of a bitmap with their shapes and entrance delays. */
export function glyphCells(bitmap: PixelBitmap): GlyphCell[] {
  return bitmap.flatMap((line, row) => [...line].flatMap((char, column) => {
    const shape = shapeByChar[char];
    return shape ? [{ column, row, shape, delayMs: (row + column) * staggerMs }] : [];
  }));
}

export function glyphSize(bitmap: PixelBitmap): { columns: number; rows: number } {
  return { columns: Math.max(0, ...bitmap.map((line) => line.length)), rows: bitmap.length };
}
