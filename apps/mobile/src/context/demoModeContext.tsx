import { createContext, useMemo, useState, type ReactNode } from "react";
import type { DemoMode } from "@/types/demo.types";
import { createMemoryStorage } from "@/demo/memoryStorage";

export const DemoModeContext = createContext<DemoMode | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const storage = useMemo(createMemoryStorage, [active]);
  const value = useMemo<DemoMode>(() => ({ active, storage, enter: () => setActive(true), exit: () => setActive(false) }), [active, storage]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}
