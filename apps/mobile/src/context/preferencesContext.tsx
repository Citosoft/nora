import { createContext, useEffect, useState, type ReactNode } from "react";
import type { PreferencesStore } from "@/types/preferences.types";
import { createPreferencesStore } from "@/preferences/preferencesStore";
import { keyValueStorage } from "@/platform/keyValueStorage";

export const PreferencesContext = createContext<PreferencesStore | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createPreferencesStore(keyValueStorage));
  useEffect(() => {
    void store.load();
  }, [store]);
  return <PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider>;
}
