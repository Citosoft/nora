import type { FocusedAgentInjectableContext } from "@/components/app/types/focusedAgentPanelParts.types";
import type { AgentSession, WorkspaceSummary } from "@shared/appTypes";

export type UseFocusedAgentInjectableContextsArgs = {
  agent: AgentSession | null;
  workspace: WorkspaceSummary | null;
};

export type UseFocusedAgentInjectableContextsResult = {
  injectableContexts: FocusedAgentInjectableContext[];
  isLoadingInjectableContexts: boolean;
};
