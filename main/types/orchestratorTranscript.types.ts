import type { AgentSession } from "@shared/appTypes";

export interface TranscriptHelperDeps {
  getWriteChain: (agentId: string) => Promise<void> | undefined;
  setWriteChain: (agentId: string, chain: Promise<void>) => void;
}

export interface TranscriptHelpers {
  readTerminalStream: (terminalStreamPath: string) => Promise<string>;
  readContextFile: (contextFilePath: string) => Promise<string>;
  initializeAgentContextFiles: (agent: AgentSession) => Promise<void>;
  queueAgentContextAppend: (agent: AgentSession, chunk: string) => void;
  clearAgentContext: (agent: AgentSession) => Promise<void>;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
}
