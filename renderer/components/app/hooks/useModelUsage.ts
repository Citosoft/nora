import { useCallback, useEffect, useMemo, useState } from "react";
import { TOOL_USAGE_POLL_INTERVAL_MS } from "@/components/app/constants/toolUsage";
import { appToolUsageStore } from "@/components/app/logic/appToolUsageStore";
import { getEnabledUsageTools, getUsagePollingToolIds } from "@/components/app/logic/modelUsageTools";
import type { ModelUsageProps } from "@/components/app/types/workspaceUtilities.types";
import { useToolUsageSnapshot } from "./useToolUsageSnapshot";

export function useModelUsage({ tools, onInstallTool, onSwitchToolAccount }: Omit<ModelUsageProps, "collapsed">) {
  const visibleTools = useMemo(() => getEnabledUsageTools(tools), [tools]);
  const pollingIds = useMemo(() => getUsagePollingToolIds(visibleTools), [visibleTools]);
  const usageByToolId = useToolUsageSnapshot();
  const [actionToolId, setActionToolId] = useState<string | null>(null);
  const [actionErrorById, setActionErrorById] = useState<Record<string, string | null>>({});

  const loadToolUsage = useCallback(async (toolId: string, force = false): Promise<void> => {
    const tool = visibleTools.find((entry) => entry.id === toolId);
    if (!tool?.detected || !tool.supportsUsageStatus) return;
    await appToolUsageStore.load(toolId, { force });
  }, [visibleTools]);

  const installTool = async (toolId: string): Promise<void> => {
    setActionToolId(toolId);
    setActionErrorById((current) => ({ ...current, [toolId]: null }));
    try { await onInstallTool(toolId); }
    catch (cause) {
      setActionErrorById((current) => ({ ...current, [toolId]: cause instanceof Error ? cause.message : "Unable to install CLI." }));
    } finally { setActionToolId((current) => current === toolId ? null : current); }
  };

  const switchToolAccount = async (toolId: string, options: { refreshUsage: boolean }): Promise<void> => {
    setActionToolId(toolId);
    setActionErrorById((current) => ({ ...current, [toolId]: null }));
    try {
      await onSwitchToolAccount(toolId);
      if (options.refreshUsage) await loadToolUsage(toolId, true);
    } catch {
      // Account switching already reports failures through the app's shared error dialog.
    } finally { setActionToolId((current) => current === toolId ? null : current); }
  };

  const toolError = (toolId: string): string | null => actionErrorById[toolId] ?? usageByToolId[toolId]?.error ?? null;

  useEffect(() => {
    if (!pollingIds.length) return;
    let cancelled = false;
    let polling = false;
    // Sequential so CLI-backed probes never run in parallel; the shared store skips tools loaded recently.
    const poll = async (): Promise<void> => {
      if (polling) return;
      polling = true;
      try {
        for (const toolId of pollingIds) {
          if (cancelled) break;
          await loadToolUsage(toolId);
        }
      } finally { polling = false; }
    };
    void poll();
    const interval = window.setInterval(() => { void poll(); }, TOOL_USAGE_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [loadToolUsage, pollingIds]);

  return { visibleTools, usageByToolId, actionToolId, toolError, loadToolUsage, installTool, switchToolAccount };
}
