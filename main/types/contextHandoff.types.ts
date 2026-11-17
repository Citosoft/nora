import type { AgentContextState } from "@shared/types/agentContext.types";

export interface ContextHandoffDependencies {
  storageRoot: string;
  readSource: (agentId: string) => Promise<AgentContextState>;
}

export interface HandoffEntry {
  title: string;
  kind: AgentContextState["entries"][number]["kind"];
  content: string;
}
