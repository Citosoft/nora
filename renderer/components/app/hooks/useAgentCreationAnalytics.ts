import { trackAnalyticsEvent } from "@/lib/analytics";
import type { CreateAgentPayload } from "@shared/appTypes";
import type { AgentCreationSource } from "@shared/types/analytics.types";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export function useAgentCreationAnalytics(): {
  trackAgentCreation: (payload: CreateAgentPayload, source: AgentCreationSource) => void;
} {
  const snapshot = useCanonicalAppSnapshot();
  const workspaceCount = snapshot?.workspaces.length ?? 0;
  const trackAgentCreation = useCallback((payload: CreateAgentPayload, source: AgentCreationSource): void => {
    trackAnalyticsEvent({
      name: "agent.created",
      properties: {
        toolId: payload.toolId, mode: payload.mode, targetKind: payload.target.kind, via: source,
        hasTask: Boolean(payload.task?.trim()), workspaceCount
      }
    });
  }, [workspaceCount]);

  return { trackAgentCreation };
}
