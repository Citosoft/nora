import type { AppMainCenterContentValue } from "@/components/app/types/appMainCenterContent.types";
import { createContext, useContext, type ReactNode } from "react";

const AppMainCenterContentContext = createContext<AppMainCenterContentValue | null>(null);

export function AppMainCenterContentProvider({
  value,
  children
}: {
  value: AppMainCenterContentValue;
  children: ReactNode;
}) {
  return (
    <AppMainCenterContentContext.Provider value={value}>
      {children}
    </AppMainCenterContentContext.Provider>
  );
}

export function useAppMainCenterContent(): AppMainCenterContentValue {
  const context = useContext(AppMainCenterContentContext);
  if (!context) {
    throw new Error("useAppMainCenterContent must be used within an AppMainCenterContentProvider.");
  }

  return context;
}
