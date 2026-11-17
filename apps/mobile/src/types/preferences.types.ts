import type { z } from "zod";
import type { preferencesSchema } from "@/preferences/preferencesSchema";

export type Preferences = z.infer<typeof preferencesSchema>;
export type ThemePreference = Preferences["theme"];
export type CachedRuntimeDirectory = NonNullable<Preferences["cachedRuntimes"]>;

export interface PreferencesStore {
  load(): Promise<void>;
  get(): Preferences;
  update(change: (current: Preferences) => Preferences): Promise<void>;
  subscribe(listener: () => void): () => void;
}
