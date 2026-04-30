import type { AgentContextEntry, AgentSession } from "@shared/appTypes";

export interface HarnessContextReadInput {
  agent: AgentSession;
  exactEntries: AgentContextEntry[];
  contextBoundaryMs: number;
}

export interface HarnessContextAdapter {
  toolId: AgentSession["toolId"];
  readEntries: (input: HarnessContextReadInput) => Promise<AgentContextEntry[]>;
}
