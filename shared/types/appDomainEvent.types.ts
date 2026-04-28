import type { ActiveRemoteMount } from "./remote.types";
import type { AgentSession, TerminalSession } from "./session.types";
import type { Screen } from "./system.types";
import type {
  GitDomainModel,
  ScriptsDomainModel,
  ToolingDomainModel,
  WorkspaceDomainModel
} from "./appDomainState.types";

/**
 * Incremental, domain-oriented notifications derived from main-process AppState transitions.
 * Emitted alongside snapshot / delta broadcasts so the renderer can move toward domain-scoped
 * stores without diffing the full AppState on every tick.
 */
export type AppDomainEvent =
  | { kind: "app.navigation"; screen: Screen; projectId: string | null }
  | { kind: "app.session.current"; sessionId: string | null }
  | {
      kind: "app.focus";
      focusedAgentId: string | null;
      focusedTerminalId: string | null;
    }
  | { kind: "app.error"; message: string | null }
  | { kind: "workspace.topology"; reason: "structureChanged" }
  | { kind: "workspace.model"; model: WorkspaceDomainModel }
  | { kind: "git.model"; model: GitDomainModel }
  | { kind: "tooling.model"; model: ToolingDomainModel }
  | { kind: "remotes.model"; mounts: ActiveRemoteMount[] }
  | { kind: "scripts.model"; model: ScriptsDomainModel }
  | { kind: "agent.patch"; agents: AgentSession[] }
  | { kind: "terminal.patch"; terminals: TerminalSession[] }
  | { kind: "agent.model"; agents: AgentSession[] }
  | { kind: "terminal.model"; terminals: TerminalSession[] };

export type AppDomainEventBatch = AppDomainEvent[];
