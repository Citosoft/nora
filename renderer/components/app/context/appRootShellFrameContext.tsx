import type { AppRootShellFrameValue } from "@/components/app/types/appRootShellFrame.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const AppRootShellFrameContext = createContext<AppRootShellFrameValue | null>(null);

export function AppRootShellFrameProvider({
  value,
  children
}: {
  value: AppRootShellFrameValue;
  children: ReactNode;
}): ReactElement {
  return <AppRootShellFrameContext.Provider value={value}>{children}</AppRootShellFrameContext.Provider>;
}

export function useAppRootShellFrame(): AppRootShellFrameValue {
  const value = useContext(AppRootShellFrameContext);
  if (!value) {
    throw new Error("useAppRootShellFrame must be used within AppRootShellFrameProvider.");
  }

  return value;
}
