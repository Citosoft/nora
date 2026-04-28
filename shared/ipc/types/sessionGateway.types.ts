import type {
  AgentContextPreview,
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  LocalTerminalState
} from "../../appTypes";

export interface SessionBridge {
  createAgent: (payload: CreateAgentPayload) => Promise<AppState>;
  focusAgent: (agentId: string) => Promise<AppState>;
  restartAgent: (agentId: string) => Promise<AppState>;
  destroyAgent: (agentId: string) => Promise<AppState>;
  sendAgentInput: (agentId: string, input: string) => Promise<AppState>;
  sendAgentTerminalInput: (agentId: string, input: string) => Promise<void>;
  getAgentTerminalBuffer: (agentId: string) => Promise<string>;
  getAgentContextPreview: (agentId: string) => Promise<AgentContextPreview>;
  clearAgentContext: (agentId: string) => Promise<AgentContextPreview>;
  clearAgentTerminal: (agentId: string) => Promise<AppState>;
  resizeAgentTerminal: (agentId: string, cols: number, rows: number) => Promise<void>;
  createTerminal: (payload: CreateTerminalPayload) => Promise<AppState>;
  focusTerminal: (sessionId: string) => Promise<AppState>;
  restartTerminal: (sessionId: string) => Promise<AppState>;
  clearTerminal: (sessionId: string) => Promise<AppState>;
  destroyTerminal: (sessionId: string) => Promise<AppState>;
  sendTerminalInput: (sessionId: string, input: string) => Promise<void>;
  getTerminalBuffer: (sessionId: string) => Promise<string>;
  resizeTerminal: (sessionId: string, cols: number, rows: number) => Promise<void>;
  openLocalTerminal: (shellId?: string) => Promise<LocalTerminalState>;
  getLocalTerminalState: () => Promise<LocalTerminalState | null>;
  onLocalTerminalStateChanged: (listener: (state: LocalTerminalState | null) => void) => () => void;
  restartLocalTerminal: () => Promise<LocalTerminalState>;
  clearLocalTerminal: () => Promise<LocalTerminalState | null>;
  destroyLocalTerminal: () => Promise<LocalTerminalState | null>;
  focusWorktree: (worktreeId: string) => Promise<AppState>;
  onTerminalData: (listener: (payload: { sessionId: string; data: string }) => void) => () => void;
  sendWindowEnter: () => Promise<void>;
}

export interface SessionGateway extends SessionBridge {}
