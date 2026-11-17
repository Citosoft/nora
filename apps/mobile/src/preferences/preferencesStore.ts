import type { Preferences, PreferencesStore } from "@/types/preferences.types";
import type { KeyValueStorage } from "@/types/storage.types";
import { defaultPreferences, preferencesSchema } from "./preferencesSchema";

export const PREFERENCES_STORAGE_KEY = "nora.preferences.v1";

export function createPreferencesStore(storage: KeyValueStorage, storageKey = PREFERENCES_STORAGE_KEY): PreferencesStore {
  let current: Preferences = defaultPreferences;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    async load() {
      const raw = await storage.getItem(storageKey);
      if (!raw) return;
      try {
        const parsed = preferencesSchema.safeParse(JSON.parse(raw));
        if (parsed.success) current = parsed.data;
      } catch {
        // Unreadable preferences fall back to defaults.
      }
      notify();
    },
    get: () => current,
    async update(change) {
      current = change(current);
      notify();
      await storage.setItem(storageKey, JSON.stringify(current));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
