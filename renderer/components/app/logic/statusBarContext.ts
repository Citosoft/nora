import type { StatusBarContextValue } from "@/components/app/types/component.types";
import { createContext, useContext } from "react";

export const StatusBarContext = createContext<StatusBarContextValue | null>(null);

export function useStatusBar(): StatusBarContextValue {
  const value = useContext(StatusBarContext);
  if (!value) {
    throw new Error("Status bar context is unavailable.");
  }
  return value;
}

export type { StatusBarContextValue } from "@/components/app/types/component.types";
