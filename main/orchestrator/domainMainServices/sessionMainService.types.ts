import type { AgentContextEntry, AgentSession, AppState } from "@shared/appTypes";
import type { SessionCreationHelpers } from "../../types/orchestratorSessionCreation.types";

type AgentTerminalActionDeps = ReturnType<
  (typeof import("../dependencyBuilders"))["buildAgentTerminalActionsDependencies"]
>;
type SessionActionDeps = ReturnType<
  (typeof import("../dependencyBuilders"))["buildSessionActionsDependencies"]
>;
type LocalTerminalHelpers = ReturnType<
  (typeof import("../localTerminal"))["createLocalTerminalHelpers"]
>;
type SessionLifecycleHelpers = ReturnType<
  (typeof import("../sessionLifecycle"))["createSessionLifecycleHelpers"]
>;

export type SessionMainServiceDeps = {
  sessionCreation: SessionCreationHelpers;
  localTerminal: LocalTerminalHelpers;
  sessionLifecycle: SessionLifecycleHelpers;
  getAgentTerminalActionDependencies: () => AgentTerminalActionDeps;
  getSessionActionDependencies: () => SessionActionDeps;
  getSnapshot: () => AppState;
  nowIso: () => string;
  randomId: () => string;
  readAgentContextEntries: (agent: AgentSession) => Promise<AgentContextEntry[]>;
  appendAgentContextEntries: (agent: AgentSession, entries: AgentContextEntry[]) => Promise<void>;
  writeAgentContextBundle: (agent: AgentSession, bundleId: string, content: string) => Promise<string>;
  resizeRuntimeSession: (sessionId: string, cols: number, rows: number) => void;
};
