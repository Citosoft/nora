import type { AccentColor, ThemeMode } from "@/components/app/types";
import type { ColorThemeId } from "@shared/types/appearance/colorTheme.types";

/** Everything that decides the app's colors: light or dark, the theme palette and the accent. */
export type AppThemeSelection = {
  themeMode: ThemeMode;
  colorTheme: ColorThemeId;
  accentColor: AccentColor;
};

export type ColorThemeOption = {
  id: ColorThemeId;
  label: string;
};

export type AccentColorOption = {
  id: AccentColor;
  label: string;
  /** Tailwind background class for the option's swatch. */
  swatchClassName: string;
};
