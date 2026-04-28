import type { AppState } from "@shared/appTypes";
import { AGENT_DEFINITIONS } from "../agentCatalog";

export const createInitialState = (): AppState => ({
  screen: "project-selector",
  project: null,
  projectBranches: [],
  currentSessionId: null,
  sessions: [],
  worktrees: [],
  workspaces: [],
  recentProjects: [],
  focusedAgentId: null,
  focusedTerminalId: null,
  selectedChangePath: null,
  selectedCommitHash: null,
  selectedCommit: null,
  changesRoot: null,
  changes: [],
  commitHistory: [],
  activeRemoteMounts: [],
  projectScripts: [],
  defaultWorktreePrepareCommand: null,
  agents: [],
  terminals: [],
  terminalShells: [],
  agentCatalog: AGENT_DEFINITIONS.map((tool) => ({
    ...tool,
    detected: false,
    enabled: true,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle",
    installLog: [],
    config: {
      values: {},
      updatedAt: null
    }
  })),
  agentSkillCatalogs: [],
  errorMessage: null
});
