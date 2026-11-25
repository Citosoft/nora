import type { ACCENT_COLOR_IDS } from "@shared/appearance/accentColors";

export type AccentColor = (typeof ACCENT_COLOR_IDS)[number];

/** Accents with their own fixed palette, as opposed to following the theme. */
export type FixedAccentColor = Exclude<AccentColor, "theme">;
