import type { AppModalDialogsContextValue } from "@/components/app/types/appModalDialogs.types";
import { createContext, useContext, type ReactNode } from "react";

const AppModalDialogsContext = createContext<AppModalDialogsContextValue | null>(null);

export const AppModalDialogsProvider = ({
  value,
  children
}: {
  value: AppModalDialogsContextValue;
  children: ReactNode;
}) => <AppModalDialogsContext.Provider value={value}>{children}</AppModalDialogsContext.Provider>;

export const useAppModalDialogs = (): AppModalDialogsContextValue => {
  const context = useContext(AppModalDialogsContext);
  if (!context) {
    throw new Error("useAppModalDialogs must be used within AppModalDialogsProvider.");
  }

  return context;
};
