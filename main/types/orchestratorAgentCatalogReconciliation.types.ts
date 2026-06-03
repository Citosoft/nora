import type { AgentSession, AppState, ProjectSummary, WorktreeRecord } from "@shared/appTypes";
import type { WorkspaceTarget } from "./internal.types";

export interface AgentCatalogReconciliationDeps {
  nowIso: () => string;
  getSnapshot: () => AppState;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  hasRuntimeSession: (sessionId: string) => boolean;
  buildResumeCommand: (agent: Pick<AgentSession, "toolId" | "command" | "resumeSessionId" | "resumeCommand">) => string | null;
  normalizeAgentLaunchCommand: (toolId: string, command: string) => string;
  resetAgentTranscript: (agent: AgentSession) => Promise<void>;
  getWorktreeTarget: (project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">) => WorkspaceTarget;
  getToolEnv: (toolId: string) => Record<string, string>;
  spawnAgentPty: (
    agentId: string,
    command: string,
    target: WorkspaceTarget,
    toolEnv: Record<string, string>
  ) => Promise<void>;
}
