import type { AppSignedInWorkspaceViewProps } from "@/components/app/types/appSignedInWorkspaceView.types";
import { createContext, useContext, type ReactNode } from "react";

const AppSignedInWorkspaceViewContext = createContext<AppSignedInWorkspaceViewProps | null>(null);

export function AppSignedInWorkspaceViewProvider({
  value,
  children
}: {
  value: AppSignedInWorkspaceViewProps;
  children: ReactNode;
}) {
  return (
    <AppSignedInWorkspaceViewContext.Provider value={value}>
      {children}
    </AppSignedInWorkspaceViewContext.Provider>
  );
}

export function useAppSignedInWorkspaceView(): AppSignedInWorkspaceViewProps {
  const context = useContext(AppSignedInWorkspaceViewContext);
  if (!context) {
    throw new Error("useAppSignedInWorkspaceView must be used within an AppSignedInWorkspaceViewProvider.");
  }
  return context;
}
