import { COLOR_THEME_IDS } from "@shared/appearance/colorThemes";
import type { ColorThemeId } from "@shared/types/appearance/colorTheme.types";
import type { ColorThemeOption } from "@/components/app/types/appTheme.types";

const COLOR_THEME_LABELS: Record<ColorThemeId, string> = {
  nora: "Nora",
  slate: "Slate",
  ocean: "Ocean",
  forest: "Forest",
  sand: "Sand",
  dusk: "Dusk",
  rose: "Rose",
  ember: "Ember",
  olive: "Olive",
  jade: "Jade"
};

export const COLOR_THEME_OPTIONS: ColorThemeOption[] = COLOR_THEME_IDS.map((id) => ({ id, label: COLOR_THEME_LABELS[id] }));
