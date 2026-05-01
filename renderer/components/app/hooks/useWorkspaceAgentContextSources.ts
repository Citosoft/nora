import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import type { UseWorkspaceAgentContextSourcesOptions } from "@/components/app/types/workspaceAgentContextSourcesHook.types";
import type { AgentContextSourceSummary } from "@shared/appTypes";
import { useEffect, useState } from "react";

export function useWorkspaceAgentContextSources(
  projectId: string | null,
  excludeAgentId?: string,
  options?: UseWorkspaceAgentContextSourcesOptions
): {
  sources: AgentContextSourceSummary[];
  isLoading: boolean;
} {
  const enabled = options?.enabled !== false;
  const [sources, setSources] = useState<AgentContextSourceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSources([]);
      setIsLoading(false);
      return;
    }

    if (!projectId) {
      setSources([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void noraAgentClient.listWorkspaceAgentContextSources(projectId, excludeAgentId)
      .then((nextSources) => {
        if (cancelled) {
          return;
        }
        setSources(nextSources);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSources([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, excludeAgentId, enabled, options?.reloadToken]);

  return {
    sources,
    isLoading
  };
}
