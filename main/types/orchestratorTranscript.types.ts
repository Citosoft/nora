import type { AgentContextEntry, AgentSession } from "@shared/appTypes";

export interface TranscriptHelperDeps {
  getWriteChain: (agentId: string) => Promise<void> | undefined;
  setWriteChain: (agentId: string, chain: Promise<void>) => void;
}

export interface TranscriptHelpers {
  readTerminalStream: (terminalStreamPath: string) => Promise<string>;
  readContextFile: (contextFilePath: string) => Promise<string>;
  readContextEntries: (contextFilePath: string) => Promise<AgentContextEntry[]>;
  initializeAgentContextFiles: (agent: AgentSession) => Promise<void>;
  appendContextEntries: (agent: AgentSession, entries: AgentContextEntry[]) => Promise<void>;
  writeContextBundle: (agent: AgentSession, bundleId: string, content: string) => Promise<string>;
  queueAgentContextAppend: (agent: AgentSession, chunk: string) => void;
  clearAgentContext: (agent: AgentSession) => Promise<void>;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
}
