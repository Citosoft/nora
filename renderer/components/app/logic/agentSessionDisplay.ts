import type { AgentSession } from "@shared/appTypes";

export const getAgentSessionDisplayTitle = (agent: Pick<AgentSession, "name" | "threadTitle">): string | null =>
  agent.threadTitle?.trim() || agent.name.trim() || null;
