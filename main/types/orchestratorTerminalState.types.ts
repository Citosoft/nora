import type {
  AgentCatalogEntry,
  AgentSession,
  AgentSkillCatalog,
  AppState,
  LocalTerminalState,
  TerminalSession
} from "@shared/appTypes";

export interface TerminalStateHelperDeps {
  nowIso: () => string;
  futureIso: (milliseconds: number) => string;
  getSnapshot: () => AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  getLocalTerminalState: () => LocalTerminalState | null;
  setLocalTerminalState: (state: LocalTerminalState | null) => void;
  getTerminalBuffer: (sessionId: string) => string;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  getTerminalActivity: (sessionId: string) => number[] | undefined;
  setTerminalActivity: (sessionId: string, timestamps: number[]) => void;
  setLiveTerminalSnapshot: (terminalId: string, terminal: TerminalSession) => void;
  appendAgentTerminalChunk: (agent: AgentSession, chunk: string) => void;
  resetAgentTranscriptFile: (agent: AgentSession) => Promise<void>;
  emitTerminalData: (sessionId: string, chunk: string) => void;
  notifyLocalTerminalChanged: (state: LocalTerminalState | null) => void;
  detectLocalUrlFromOutput: (value: string, host?: string) => { url: string | null; port: number | null };
  didReturnToShellPrompt: (value: string) => boolean;
  getLastMeaningfulTerminalLine: (value: string) => string;
  getLastMeaningfulAgentOutputLine: (value: string) => string;
  hasBusyTerminalActivity: (value: string) => boolean;
  extractResumeDetails: (
    agent: AgentSession,
    value: string
  ) => Partial<Pick<AgentSession, "resumeSessionId" | "resumeCommand">> | null;
  buildResumeCommand: (agent: AgentSession) => string | null;
}

export interface TerminalStateHelpers {
  appendAgentOutput: (agentId: string, chunk: string) => void;
  appendTerminalOutput: (terminalId: string, chunk: string) => void;
  appendLocalTerminalOutput: (chunk: string) => void;
  appendAgentSystemMessage: (agentId: string, message: string) => void;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
  resetTerminalTranscript: (terminal: TerminalSession) => void;
  resetLocalTerminalTranscript: () => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
  updateLocalTerminal: (partial: Partial<LocalTerminalState>) => void;
  updateCatalogTool: (toolId: string, partial: Partial<AgentCatalogEntry>) => void;
  updateAgentSkillCatalog: (nextCatalog: AgentSkillCatalog) => void;
}
