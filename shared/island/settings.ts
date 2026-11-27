import { ISLAND_SIZES } from "@shared/island/contracts";
import { DEFAULT_APP_SETTINGS } from "@shared/types/system.types";
import type { IslandSize, NotchIslandSettings } from "@shared/types/island/island.types";

/** How much each size grows the island from the notch; the smallest is the notch itself. */
export const ISLAND_SIZE_SCALE: Readonly<Record<IslandSize, number>> = { notch: 1, medium: 1.15, large: 1.3 };

function isIslandSize(value: unknown): value is IslandSize {
  return typeof value === "string" && (ISLAND_SIZES as readonly string[]).includes(value);
}

/** Reads stored island settings, keeping each valid field and defaulting the rest. */
export function parseNotchIslandSettings(candidate: unknown): NotchIslandSettings {
  const fallback = DEFAULT_APP_SETTINGS.notchIsland;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return fallback;
  const { enabled, alwaysShow, size } = candidate as Partial<Record<keyof NotchIslandSettings, unknown>>;
  return {
    enabled: typeof enabled === "boolean" ? enabled : fallback.enabled,
    alwaysShow: typeof alwaysShow === "boolean" ? alwaysShow : fallback.alwaysShow,
    size: isIslandSize(size) ? size : fallback.size
  };
}
