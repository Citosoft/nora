import type { PixelBitmap } from "./pixelField.types";

/** One welcome page before sign-in. */
export interface OnboardingSlide {
  id: string;
  glyph: PixelBitmap;
  /** Small caps label above the title, e.g. "Chat". */
  eyebrow: string;
  title: string;
  body: string;
}
