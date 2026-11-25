import { ACCENT_COLOR_IDS } from "@shared/appearance/accentColors";
import type { AccentColor } from "@shared/types/appearance/accentColor.types";
import type { AccentColorOption } from "@/components/app/types/appTheme.types";

// Full class strings so Tailwind finds them; "theme" shows the current theme's own accent.
const ACCENT_COLOR_COPY: Record<AccentColor, Omit<AccentColorOption, "id">> = {
  theme: { label: "Theme", swatchClassName: "bg-[hsl(var(--theme-accent))]" },
  silver: { label: "Silver", swatchClassName: "bg-[hsl(220_9%_46%)]" },
  green: { label: "Green", swatchClassName: "bg-[hsl(161_67%_37%)]" },
  blue: { label: "Blue", swatchClassName: "bg-[hsl(213_79%_47%)]" },
  amber: { label: "Amber", swatchClassName: "bg-[hsl(32_95%_45%)]" },
  rose: { label: "Rose", swatchClassName: "bg-[hsl(346_78%_47%)]" },
  violet: { label: "Violet", swatchClassName: "bg-[hsl(262_73%_54%)]" }
};

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = ACCENT_COLOR_IDS.map((id) => ({ id, ...ACCENT_COLOR_COPY[id] }));
