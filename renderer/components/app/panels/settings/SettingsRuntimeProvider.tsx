import type { SettingsRuntimeValue } from "@/components/app/types/settings.types";
import { createContext, type ReactNode } from "react";

export const SettingsRuntimeContext = createContext<SettingsRuntimeValue | null>(null);

export function SettingsRuntimeProvider({
  value,
  children
}: {
  value: SettingsRuntimeValue;
  children: ReactNode;
}) {
  return (
    <SettingsRuntimeContext.Provider value={value}>
      {children}
    </SettingsRuntimeContext.Provider>
  );
}
