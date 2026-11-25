import { DEFAULT_APP_SETTINGS } from "@shared/types/system.types";
import type { AppSettings } from "@shared/types/system.types";
import type { ThreadBackdropSettings } from "@shared/types/threadBackdrop.types";

/** Reads stored backdrop settings, keeping each valid field and defaulting the rest. */
export function parseThreadBackdropSettings(candidate: unknown): ThreadBackdropSettings {
  const fallback = DEFAULT_APP_SETTINGS.threadBackdrop;
  if (!candidate || typeof candidate !== "object") return fallback;
  const { animated, scope } = candidate as Partial<Record<keyof ThreadBackdropSettings, unknown>>;
  return {
    animated: typeof animated === "boolean" ? animated : fallback.animated,
    scope: scope === "new" || scope === "all" ? scope : fallback.scope
  };
}

/** Whether a thread view draws the pixel terrain: a new thread has no conversation yet. */
export function showsThreadBackdrop(settings: ThreadBackdropSettings, hasConversation: boolean): boolean {
  return settings.animated && (settings.scope === "all" || !hasConversation);
}

/**
 * The backdrop settings a thread view should honour, or null when the backdrop is unavailable.
 * The terrain is a continuously redrawn canvas, so it is off whenever GPU acceleration is disabled,
 * without changing the stored (and synced) backdrop preference.
 */
export function availableThreadBackdrop(settings: Pick<AppSettings, "threadBackdrop" | "hardwareAccelerationEnabled">): ThreadBackdropSettings | null {
  return settings.hardwareAccelerationEnabled ? settings.threadBackdrop : null;
}
