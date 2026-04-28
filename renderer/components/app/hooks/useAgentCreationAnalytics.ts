import { trackAnalyticsEvent } from "@/lib/analytics";
import type { CreateAgentPayload } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export type AgentCreationSource =
  | "task-panel"
  | "task-reference"
  | "task-planner"
  | "dialog"
  | "forge-issue"
  | "shortcut";

export function useAgentCreationAnalytics(): {
  trackAgentCreation: (payload: CreateAgentPayload, source: AgentCreationSource) => void;
} {
  const snapshot = useCanonicalAppSnapshot();
  const trackAgentCreation = useCallback((payload: CreateAgentPayload, source: AgentCreationSource): void => {
    trackAnalyticsEvent("agent.created", {
      toolId: payload.toolId,
      mode: payload.mode,
      targetKind: payload.target.kind,
      via: source,
      hasTask: Boolean(payload.task?.trim()),
      workspaceId: snapshot?.project?.id ?? null,
      workspaceCount: snapshot?.workspaces.length ?? 0
    });
  }, [snapshot]);

  return { trackAgentCreation };
}
