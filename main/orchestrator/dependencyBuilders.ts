import type { AgentSession, AppState, TerminalSession } from "@shared/appTypes";
import type { WorkspaceActionsDependencies } from "./workspaceActions";
import type { WorkspaceTarget } from "../types/internal.types";

export function buildSessionActionsDependencies(params: {
  getSnapshot: () => AppState;
  refreshProjectState: () => Promise<AppState>;
  commitWorkspaceChanges: (target: WorkspaceTarget, message: string, paths: string[] | null) => Promise<void>;
  pushWorkspaceChanges: (target: WorkspaceTarget) => Promise<void>;
  appendAgentSystemMessage: (agentId: string, message: string) => void;
  stopAllAgents: () => Promise<void>;
  killAgentSession: (agentId: string) => void;
  setAgentStopped: (agentId: string) => void;
  hasAgentSession: (agentId: string) => boolean;
  writeAgentSessionInput: (agentId: string, input: string) => void;
  delay: (ms: number) => Promise<void>;
}) {
  assertDependencyFunctions("session actions", params, [
    "getSnapshot",
    "refreshProjectState",
    "commitWorkspaceChanges",
    "pushWorkspaceChanges",
    "appendAgentSystemMessage",
    "stopAllAgents",
    "killAgentSession",
    "setAgentStopped",
    "hasAgentSession",
    "writeAgentSessionInput",
    "delay"
  ]);
  return Object.freeze({ ...params });
}

export function buildWorkspaceActionsDependencies(
  params: WorkspaceActionsDependencies
): WorkspaceActionsDependencies {
  return Object.freeze({ ...params });
}

export function buildAgentTerminalActionsDependencies(params: {
  nowIso: () => string;
  getSnapshot: () => AppState;
  getPtySession: (sessionId: string) => { write: (input: string) => void } | null;
  getContextWriteChain: (agentId: string) => Promise<void> | null;
  setContextWriteChain: (agentId: string, chain: Promise<void>) => void;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
  resetTerminalTranscript: (terminal: TerminalSession) => Promise<void>;
  clearAgentContextFile: (agent: AgentSession) => Promise<void>;
}) {
  assertDependencyFunctions("agent terminal actions", params, [
    "nowIso",
    "getSnapshot",
    "getPtySession",
    "getContextWriteChain",
    "setContextWriteChain",
    "setTerminalBuffer",
    "deleteTerminalActivity",
    "updateAgent",
    "updateTerminal",
    "resetTerminalTranscript",
    "clearAgentContextFile"
  ]);
  return Object.freeze({ ...params });
}

function assertDependencyFunctions<T extends Record<string, unknown>>(
  name: string,
  params: T,
  keys: Array<keyof T>
): void {
  for (const key of keys) {
    if (typeof params[key] !== "function") {
      throw new Error(`Invalid ${name} dependency: ${String(key)} must be a function.`);
    }
  }
}
