import type { AgentSession, AppState, ProjectSummary, TerminalSession } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";
import {
  buildAgentTerminalActionsDependencies,
  buildSessionActionsDependencies,
  buildWorkspaceActionsDependencies
} from "./dependencyBuilders";
import { createWorkspaceActions } from "./workspaceActions";

export function createCachedSessionActionsDependencies(
  cache: ReturnType<typeof buildSessionActionsDependencies> | null,
  deps: Parameters<typeof buildSessionActionsDependencies>[0]
): ReturnType<typeof buildSessionActionsDependencies> {
  if (cache) {
    return cache;
  }
  return buildSessionActionsDependencies(deps);
}

export function createCachedWorkspaceActions(
  cache: ReturnType<typeof createWorkspaceActions> | null,
  deps: Parameters<typeof buildWorkspaceActionsDependencies>[0]
): ReturnType<typeof createWorkspaceActions> {
  if (cache) {
    return cache;
  }
  return createWorkspaceActions(buildWorkspaceActionsDependencies(deps));
}

export function createCachedAgentTerminalActionsDependencies(
  cache: ReturnType<typeof buildAgentTerminalActionsDependencies> | null,
  deps: Parameters<typeof buildAgentTerminalActionsDependencies>[0]
): ReturnType<typeof buildAgentTerminalActionsDependencies> {
  if (cache) {
    return cache;
  }
  return buildAgentTerminalActionsDependencies(deps);
}

export type OrchestratorWorkspaceActionsDeps = {
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
  resolveWorkspaceFileTarget: (project: ProjectSummary, rootPath?: string) => WorkspaceTarget;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  getSnapshot: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshProjectState: () => Promise<AppState>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
};

export type OrchestratorAgentTerminalDeps = {
  getSnapshot: () => AppState;
  getPtySession: (sessionId: string) => { write: (input: string) => void } | null;
  getContextWriteChain: (agentId: string) => Promise<void> | null;
  setContextWriteChain: (agentId: string, chain: Promise<void>) => void;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  resetTerminalTranscript: (terminal: TerminalSession) => Promise<void>;
  clearAgentContextFile: (agent: AgentSession) => Promise<void>;
};
