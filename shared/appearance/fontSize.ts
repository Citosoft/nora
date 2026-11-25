export const UI_FONT_SIZES = [14, 16, 18, 20] as const;

export type UiFontSize = (typeof UI_FONT_SIZES)[number];

export const DEFAULT_UI_FONT_SIZE: UiFontSize = 16;

export function normalizeUiFontSize(value: number | undefined): UiFontSize {
  for (const size of UI_FONT_SIZES) {
    if (size === value) return size;
  }
  return DEFAULT_UI_FONT_SIZE;
}
