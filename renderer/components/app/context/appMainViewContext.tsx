import type { AppMainViewProps } from "@/components/app/types/appMainView.types";
import { createContext, useContext, type ReactNode } from "react";

const AppMainViewContext = createContext<AppMainViewProps | null>(null);

export function AppMainViewProvider({
  value,
  children
}: {
  value: AppMainViewProps;
  children: ReactNode;
}) {
  return <AppMainViewContext.Provider value={value}>{children}</AppMainViewContext.Provider>;
}

export function useAppMainView(): AppMainViewProps {
  const context = useContext(AppMainViewContext);
  if (!context) {
    throw new Error("useAppMainView must be used within an AppMainViewProvider.");
  }
  return context;
}
