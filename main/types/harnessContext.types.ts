import type { AgentContextEntry, AgentSession } from "@shared/appTypes";

export interface HarnessContextReadInput {
  agent: AgentSession;
  exactEntries: AgentContextEntry[];
  contextBoundaryMs: number;
  /** When set, read this transcript file instead of searching default harness stores. */
  forcedArtifactPath?: string;
}

export interface HarnessContextAdapter {
  toolId: AgentSession["toolId"];
  readEntries: (input: HarnessContextReadInput) => Promise<AgentContextEntry[]>;
}
