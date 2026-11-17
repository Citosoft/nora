import { DEFAULT_APP_SETTINGS, type DesktopLifecycleSettings } from "@shared/types/system.types";

/** Reads persisted or IPC-supplied lifecycle settings, falling back field by field to the defaults. */
export function parseDesktopLifecycleSettings(candidate: unknown): DesktopLifecycleSettings {
  const defaults = DEFAULT_APP_SETTINGS.lifecycle;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return defaults;
  const keepRunningInBackground = "keepRunningInBackground" in candidate ? candidate.keepRunningInBackground : undefined;
  const launchAtLogin = "launchAtLogin" in candidate ? candidate.launchAtLogin : undefined;
  return {
    keepRunningInBackground: typeof keepRunningInBackground === "boolean" ? keepRunningInBackground : defaults.keepRunningInBackground,
    launchAtLogin: typeof launchAtLogin === "boolean" ? launchAtLogin : defaults.launchAtLogin
  };
}
