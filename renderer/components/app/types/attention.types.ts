import type { AgentSession } from "@shared/appTypes";

export type UseAgentAttentionArgs = {
  focusedAgentId: string | null;
  onAgentCompletion?: (agent: AgentSession) => void | Promise<void>;
};

export type UseAgentAttentionResult = {
  agentsNeedingAttention: Record<string, boolean>;
};
