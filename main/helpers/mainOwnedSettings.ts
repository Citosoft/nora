import { DEFAULT_APP_SETTINGS, type AppSettings } from "@shared/appTypes";

/**
 * Personalization (roles, the new-thread model) is changed only through personalization requests. The renderer's
 * settings snapshot can predate those changes, so its saves must not write them back. Apply only changes against
 * the renderer's baseline so a stale snapshot also preserves unrelated settings received from another device.
 */
export function withMainOwnedSettings(current: AppSettings, fromRenderer: AppSettings, baseline: AppSettings): AppSettings {
  const next = { ...current };
  const apply = <K extends keyof AppSettings>(key: K): void => {
    if (key !== "personalization" && JSON.stringify(fromRenderer[key]) !== JSON.stringify(baseline[key])) next[key] = fromRenderer[key];
  };
  // Reflect the trusted, complete domain defaults rather than keys from an IPC payload.
  for (const key of Object.keys(DEFAULT_APP_SETTINGS) as (keyof AppSettings)[]) apply(key);
  return next;
}
