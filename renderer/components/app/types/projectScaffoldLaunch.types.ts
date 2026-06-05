import type { AppState, CreateAgentPayload, CreateProjectWorkspacePayload, CreateProjectWorkspaceResult } from "@shared/appTypes";
import type { AgentPromptSubmission } from "@shared/types/agentContext.types";

export type ProjectScaffoldSnapshotUpdater = (snapshot: AppState) => void;

export type ProjectScaffoldHandoff = (options: {
  agentId: string;
  prompt: AgentPromptSubmission;
  updateSnapshot: ProjectScaffoldSnapshotUpdater;
}) => Promise<void>;

export type LaunchProjectScaffoldAgentDeps = {
  createProjectWorkspace: (payload: CreateProjectWorkspacePayload) => Promise<CreateProjectWorkspaceResult>;
  createAgent: (payload: CreateAgentPayload) => Promise<AppState>;
  normalizeSnapshot: (snapshot: AppState) => AppState;
  updateSnapshot: ProjectScaffoldSnapshotUpdater;
  handoffPrompt: ProjectScaffoldHandoff;
};

export type LaunchProjectScaffoldAgentInput = {
  payload: CreateAgentPayload;
  projectName: string;
};

export type LaunchProjectScaffoldAgentResult = {
  agentId: string | null;
  projectRoot: string | null;
};
