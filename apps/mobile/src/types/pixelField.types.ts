import type { StyleProp, ViewStyle } from "react-native";

/** The size of a dot-matrix field in whole cells. */
export interface PixelGrid {
  columns: number;
  rows: number;
}

/** How a terrain field is shaded; shared by the native (keyframed) and web (canvas) renderers. */
export interface PixelTerrainShading {
  /** Multiplies every cell's opacity; the website uses roughly 0.4 on small screens. */
  intensity: number;
  /** Fraction of the width over which the field fades out at the left and right edges; 0 keeps it edge to edge. Web only: the native strip slides, so it runs edge to edge. */
  edgeFade: number;
  /** Fraction of the height over which the ground fades into the page at the bottom; 0 keeps a hard edge. */
  bottomFade: number;
}

export interface PixelFieldProps extends Partial<PixelTerrainShading> {
  style?: StyleProp<ViewStyle>;
  /** Dot colour; defaults to the theme's text colour, like the website's ink. */
  color?: string;
}

/**
 * A small bitmap drawn in the app icon's pixel language: `#` is a lit cell, `<` and `>` are faint
 * half-width cells on the left or right of their slot (the mark's diagonal), anything else is empty.
 */
export type PixelBitmap = readonly string[];

export type GlyphCellShape = "full" | "left" | "right";

export interface GlyphCell {
  column: number;
  row: number;
  shape: GlyphCellShape;
  /** Delay before the cell pixels in, sweeping diagonally from the top left. */
  delayMs: number;
}

export interface PixelGlyphProps {
  bitmap: PixelBitmap;
  /** Edge length of one cell in points. */
  cell?: number;
  color?: string;
  /** Changing the key replays the pixel-in animation (e.g. when an onboarding page becomes active). */
  playKey?: string | number;
  /** Draws the glyph straight away with no pixel-in, e.g. when it takes over from the identical native splash. */
  still?: boolean;
}
