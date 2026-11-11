import { useSyncExternalStore } from "react";
import { appToolUsageStore } from "@/components/app/logic/appToolUsageStore";
import type { ToolUsageSnapshot } from "@/components/app/types/toolUsage.types";

export function useToolUsageSnapshot(): ToolUsageSnapshot {
  return useSyncExternalStore(appToolUsageStore.subscribe, appToolUsageStore.getSnapshot);
}
