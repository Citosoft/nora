import { useCallback, useEffect, useMemo, useState } from "react";
import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { getEnabledUsageTools, getUsagePollingToolIds } from "@/components/app/logic/modelUsageTools";
import type { ModelUsageProps } from "@/components/app/types/workspaceUtilities.types";
import type { ToolUsageInfo } from "@shared/appTypes";

const USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useModelUsage({ tools, onInstallTool, onSwitchToolAccount }: Omit<ModelUsageProps, "collapsed">) {
  const visibleTools = useMemo(() => getEnabledUsageTools(tools), [tools]);
  const pollingIds = useMemo(() => getUsagePollingToolIds(visibleTools), [visibleTools]);
  const [usageByToolId, setUsageByToolId] = useState<Record<string, ToolUsageInfo | null>>({});
  const [usageLoadingToolId, setUsageLoadingToolId] = useState<string | null>(null);
  const [actionToolId, setActionToolId] = useState<string | null>(null);
  const [toolErrorById, setToolErrorById] = useState<Record<string, string | null>>({});

  const loadToolUsage = useCallback(async (toolId: string): Promise<void> => {
    const tool = visibleTools.find((entry) => entry.id === toolId);
    if (!tool?.detected || !tool.supportsUsageStatus) return;
    setUsageLoadingToolId(toolId);
    try {
      const usage = await noraToolingClient.getToolUsage(toolId);
      setUsageByToolId((current) => ({ ...current, [toolId]: usage }));
      setToolErrorById((current) => ({ ...current, [toolId]: null }));
    } catch (cause) {
      setToolErrorById((current) => ({ ...current, [toolId]: cause instanceof Error ? cause.message : "Unable to load usage." }));
    } finally {
      setUsageLoadingToolId((current) => current === toolId ? null : current);
    }
  }, [visibleTools]);

  const installTool = async (toolId: string): Promise<void> => {
    setActionToolId(toolId);
    setToolErrorById((current) => ({ ...current, [toolId]: null }));
    try { await onInstallTool(toolId); }
    catch (cause) {
      setToolErrorById((current) => ({ ...current, [toolId]: cause instanceof Error ? cause.message : "Unable to install CLI." }));
    } finally { setActionToolId((current) => current === toolId ? null : current); }
  };

  const switchToolAccount = async (toolId: string, options: { refreshUsage: boolean }): Promise<void> => {
    setActionToolId(toolId);
    setToolErrorById((current) => ({ ...current, [toolId]: null }));
    try {
      await onSwitchToolAccount(toolId);
      if (options.refreshUsage) await loadToolUsage(toolId);
    } catch {
      // Account switching already reports failures through the app's shared error dialog.
    } finally { setActionToolId((current) => current === toolId ? null : current); }
  };

  useEffect(() => {
    if (!pollingIds.length) return;
    let cancelled = false;
    let polling = false;
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
    const interval = window.setInterval(() => { void poll(); }, USAGE_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [loadToolUsage, pollingIds]);

  return { visibleTools, usageByToolId, usageLoadingToolId, actionToolId, toolErrorById, loadToolUsage, installTool, switchToolAccount };
}
