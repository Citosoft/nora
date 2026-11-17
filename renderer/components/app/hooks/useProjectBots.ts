import { useMemo } from "react";
import { effectiveBots } from "@shared/bots/catalog";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";

/** Resolve the native workspace's bot catalog for a shell project. */
export function useProjectBots(projectId: string) {
  const { boot } = useNativeRuntimePorts();
  const workspaceId = boot.workspaces.find((entry) => entry.shellProjectId === projectId)?.id ?? null;
  return useMemo(() => effectiveBots(boot.personalization.bots, workspaceId, boot.sharedBots).map((entry) => entry.bot),
    [boot.personalization.bots, workspaceId, boot.sharedBots]);
}
