import type { WindowSettings } from "@shared/types/nora-tools/settings.types";

export type SettingsSetters<T> = { [K in keyof T]: (value: T[K]) => void };
export type WindowPreferences = WindowSettings["appearance"] & WindowSettings["local"];
export type WindowSettingsSetters = SettingsSetters<WindowPreferences>;
