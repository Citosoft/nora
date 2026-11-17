import { useContext, useSyncExternalStore } from "react";
import type { Preferences, PreferencesStore } from "@/types/preferences.types";
import { PreferencesContext } from "@/context/preferencesContext";

export function usePreferencesStore(): PreferencesStore {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error("usePreferences must be used inside PreferencesProvider");
  return store;
}

export function usePreferences(): { preferences: Preferences; update: PreferencesStore["update"] } {
  const store = usePreferencesStore();
  const preferences = useSyncExternalStore(store.subscribe, store.get, store.get);
  return { preferences, update: store.update };
}
