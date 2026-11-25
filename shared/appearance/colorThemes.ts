import type { ColorThemeId } from "@shared/types/appearance/colorTheme.types";

/** Every app color theme. Each has a light and dark variant; Nora is the original palette. */
export const COLOR_THEME_IDS = ["nora", "slate", "ocean", "forest", "sand", "dusk", "rose", "ember", "olive", "jade"] as const;

export const DEFAULT_COLOR_THEME_ID: ColorThemeId = "nora";

export function isColorThemeId(value: unknown): value is ColorThemeId {
  return typeof value === "string" && (COLOR_THEME_IDS as readonly string[]).includes(value);
}
