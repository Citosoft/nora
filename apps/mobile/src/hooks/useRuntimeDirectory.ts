import { useContext } from "react";
import type { RuntimeDirectoryApi } from "@/types/runtimeDirectory.types";
import { RuntimeDirectoryContext } from "@/context/runtimeDirectoryContext";

export function useRuntimeDirectory(): RuntimeDirectoryApi {
  const api = useContext(RuntimeDirectoryContext);
  if (!api) throw new Error("useRuntimeDirectory must be used inside RuntimeDirectoryProvider");
  return api;
}
