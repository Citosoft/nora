import type { LocalTerminalDockProps } from "@/components/app/types/component.types";
import { createContext, useContext, type ReactNode } from "react";

const LocalTerminalDockContext = createContext<LocalTerminalDockProps | null>(null);

export function LocalTerminalDockProvider({
  value,
  children
}: {
  value: LocalTerminalDockProps;
  children: ReactNode;
}) {
  return (
    <LocalTerminalDockContext.Provider value={value}>
      {children}
    </LocalTerminalDockContext.Provider>
  );
}

export function useLocalTerminalDock(): LocalTerminalDockProps {
  const context = useContext(LocalTerminalDockContext);
  if (!context) {
    throw new Error("useLocalTerminalDock must be used within a LocalTerminalDockProvider.");
  }

  return context;
}
