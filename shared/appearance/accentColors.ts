import type { AccentColor } from "@shared/types/appearance/accentColor.types";

/** "theme" follows the selected color theme's own accent; the rest are fixed accents that override it. */
export const ACCENT_COLOR_IDS = ["theme", "silver", "green", "blue", "amber", "rose", "violet"] as const;

export const DEFAULT_ACCENT_COLOR: AccentColor = "theme";

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === "string" && (ACCENT_COLOR_IDS as readonly string[]).includes(value);
}
