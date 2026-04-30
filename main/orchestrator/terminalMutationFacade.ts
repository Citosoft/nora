import type {
  AgentCatalogEntry,
  AgentContextEntry,
  AgentSession,
  AgentSkillCatalog,
  LocalTerminalState,
  TerminalSession
} from "@shared/appTypes";

type TerminalStateHelpers = {
  appendAgentOutput: (agentId: string, chunk: string) => void;
  appendTerminalOutput: (terminalId: string, chunk: string) => void;
  appendLocalTerminalOutput: (chunk: string) => void;
  appendAgentSystemMessage: (agentId: string, message: string) => void;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
  updateLocalTerminal: (partial: Partial<LocalTerminalState>) => void;
  updateCatalogTool: (toolId: string, partial: Partial<AgentCatalogEntry>) => void;
  updateAgentSkillCatalog: (nextCatalog: AgentSkillCatalog) => void;
  resetTerminalTranscript: (terminal: TerminalSession) => void;
  resetLocalTerminalTranscript: () => void;
};

type TranscriptHelpers = {
  initializeAgentContextFiles: (agent: AgentSession) => Promise<void>;
  readContextFile: (contextFilePath: string) => Promise<string>;
  readContextEntries: (contextFilePath: string) => Promise<AgentContextEntry[]>;
  appendContextEntries: (agent: AgentSession, entries: AgentContextEntry[]) => Promise<void>;
  writeContextBundle: (agent: AgentSession, bundleId: string, content: string) => Promise<string>;
  clearAgentContext: (agent: AgentSession) => Promise<void>;
};

export class TerminalMutationFacade {
  constructor(
    private readonly terminalStateHelpers: TerminalStateHelpers,
    private readonly transcriptHelpers: TranscriptHelpers
  ) {}

  appendAgentOutput(agentId: string, chunk: string): void {
    this.terminalStateHelpers.appendAgentOutput(agentId, chunk);
  }

  appendTerminalOutput(terminalId: string, chunk: string): void {
    this.terminalStateHelpers.appendTerminalOutput(terminalId, chunk);
  }

  appendLocalTerminalOutput(chunk: string): void {
    this.terminalStateHelpers.appendLocalTerminalOutput(chunk);
  }

  async initializeAgentContextFiles(agent: AgentSession): Promise<void> {
    return this.transcriptHelpers.initializeAgentContextFiles(agent);
  }

  appendAgentSystemMessage(agentId: string, message: string): void {
    this.terminalStateHelpers.appendAgentSystemMessage(agentId, message);
  }

  async resetAgentTranscript(agent: AgentSession): Promise<void> {
    await this.terminalStateHelpers.resetAgentTranscript(agent);
  }

  updateAgent(agentId: string, partial: Partial<AgentSession>): void {
    this.terminalStateHelpers.updateAgent(agentId, partial);
  }

  updateTerminal(terminalId: string, partial: Partial<TerminalSession>): void {
    this.terminalStateHelpers.updateTerminal(terminalId, partial);
  }

  updateLocalTerminal(partial: Partial<LocalTerminalState>): void {
    this.terminalStateHelpers.updateLocalTerminal(partial);
  }

  updateCatalogTool(toolId: string, partial: Partial<AgentCatalogEntry>): void {
    this.terminalStateHelpers.updateCatalogTool(toolId, partial);
  }

  updateAgentSkillCatalog(nextCatalog: AgentSkillCatalog): void {
    this.terminalStateHelpers.updateAgentSkillCatalog(nextCatalog);
  }

  async readContextFile(contextFilePath: string): Promise<string> {
    return this.transcriptHelpers.readContextFile(contextFilePath);
  }

  async readContextEntries(contextFilePath: string): Promise<AgentContextEntry[]> {
    return this.transcriptHelpers.readContextEntries(contextFilePath);
  }

  async appendContextEntries(agent: AgentSession, entries: AgentContextEntry[]): Promise<void> {
    await this.transcriptHelpers.appendContextEntries(agent, entries);
  }

  async writeContextBundle(agent: AgentSession, bundleId: string, content: string): Promise<string> {
    return this.transcriptHelpers.writeContextBundle(agent, bundleId, content);
  }

  async resetTerminalTranscript(terminal: TerminalSession): Promise<void> {
    this.terminalStateHelpers.resetTerminalTranscript(terminal);
  }

  resetLocalTerminalTranscript(): void {
    this.terminalStateHelpers.resetLocalTerminalTranscript();
  }

  async clearAgentContext(agent: AgentSession): Promise<void> {
    await this.transcriptHelpers.clearAgentContext(agent);
  }
}
