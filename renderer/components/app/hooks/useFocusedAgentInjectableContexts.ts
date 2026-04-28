import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import type { FocusedAgentInjectableContext } from "@/components/app/types/focusedAgentPanelParts.types";
import type {
  UseFocusedAgentInjectableContextsArgs,
  UseFocusedAgentInjectableContextsResult
} from "@/components/app/types/useFocusedAgentInjectableContexts.types";
import { useEffect, useMemo, useState } from "react";

export const useFocusedAgentInjectableContexts = ({
  agent,
  workspace
}: UseFocusedAgentInjectableContextsArgs): UseFocusedAgentInjectableContextsResult => {
  const [injectableContexts, setInjectableContexts] = useState<FocusedAgentInjectableContext[]>([]);
  const [isLoadingInjectableContexts, setIsLoadingInjectableContexts] = useState(false);

  const otherAgentIdsKey = useMemo(
    () =>
      agent && workspace
        ? workspace.agents
            .filter((entry) => entry.id !== agent.id)
            .map((entry) => entry.id)
            .sort()
            .join("|")
        : "",
    [agent?.id, workspace?.agents]
  );

  useEffect(() => {
    if (!agent || !workspace) {
      setInjectableContexts([]);
      setIsLoadingInjectableContexts(false);
      return;
    }

    const otherAgents = workspace.agents.filter((entry) => entry.id !== agent.id);
    if (!otherAgents.length) {
      setInjectableContexts([]);
      setIsLoadingInjectableContexts(false);
      return;
    }

    let cancelled = false;
    setIsLoadingInjectableContexts(true);
    void Promise.all(
      otherAgents.map(async (entry): Promise<FocusedAgentInjectableContext | null> => {
        try {
          const preview = await noraAgentClient.getAgentContextPreview(entry.id);
          const content = preview.content.trim();
          if (!content) {
            return null;
          }
          return {
            agentId: entry.id,
            agentName: entry.name,
            toolLabel: entry.toolLabel,
            contextFilePath: preview.contextFilePath,
            preview: content.slice(0, 160)
          };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) {
        return;
      }
      setInjectableContexts(results.filter((entry): entry is FocusedAgentInjectableContext => entry !== null));
      setIsLoadingInjectableContexts(false);
    });

    return () => {
      cancelled = true;
    };
  }, [agent?.id, otherAgentIdsKey]);

  return {
    injectableContexts,
    isLoadingInjectableContexts
  };
};
