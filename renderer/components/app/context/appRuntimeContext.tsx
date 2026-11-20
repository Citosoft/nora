import { createContext, useContext } from "react";
import type { AppRuntime } from "@/components/app/types/apps.types";

/** The open app's runtime, for catalog components that run actions or read source state. */
export const AppRuntimeContext = createContext<AppRuntime | null>(null);

export function useAppRuntimeContext(): AppRuntime {
  const runtime = useContext(AppRuntimeContext);
  if (!runtime) throw new Error("App components render inside an AppRenderer");
  return runtime;
}
