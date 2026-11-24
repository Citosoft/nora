import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PreferencesStore } from "@/types/preferences.types";
import { createPreferencesStore } from "@/preferences/preferencesStore";
import { keyValueStorage } from "@/platform/keyValueStorage";

import { useDemoMode } from "@/hooks/useDemoMode";

export const PreferencesContext = createContext<PreferencesStore | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { active, storage } = useDemoMode();
  const [realStore] = useState(() => createPreferencesStore(keyValueStorage));
  const demoStore = useMemo(() => createPreferencesStore(storage), [storage]);
  const store = active ? demoStore : realStore;
  useEffect(() => {
    void store.load();
  }, [store]);
  return <PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider>;
}
