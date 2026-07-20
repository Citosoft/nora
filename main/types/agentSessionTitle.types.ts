import type { AgentSession } from "@shared/appTypes";

export type AgentSessionTitleLookupInput = Pick<
  AgentSession,
  "id" | "name" | "toolId" | "workspace" | "resumeSessionId" | "threadTitle"
>;

export type AgentSessionTitleResolverOptions = {
  codexSessionIndexPath?: string;
  claudeConfigDir?: string;
};

