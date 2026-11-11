import { useCallback, useEffect } from "react";
import { TOOL_USAGE_POLL_INTERVAL_MS } from "@/components/app/constants/toolUsage";
import { appToolUsageStore } from "@/components/app/logic/appToolUsageStore";
import type { ToolUsageEntry } from "@/components/app/types/toolUsage.types";
import { useToolUsageSnapshot } from "./useToolUsageSnapshot";

/** Usage for one tool, loaded on mount and kept fresh while mounted. */
export function useToolUsage(toolId: string | null): { entry: ToolUsageEntry | null; load(force?: boolean): void } {
  const snapshot = useToolUsageSnapshot();
  useEffect(() => {
    if (!toolId) return;
    void appToolUsageStore.load(toolId);
    const interval = window.setInterval(() => { void appToolUsageStore.load(toolId); }, TOOL_USAGE_POLL_INTERVAL_MS);
    return () => { window.clearInterval(interval); };
  }, [toolId]);
  const load = useCallback((force = false) => {
    if (toolId) void appToolUsageStore.load(toolId, { force });
  }, [toolId]);
  return { entry: toolId ? snapshot[toolId] ?? null : null, load };
}
