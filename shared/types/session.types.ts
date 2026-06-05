import type {
  ActiveRemoteMount
} from "./remote.types";
import type { AgentMode, AgentStatus, InstallStatus, TerminalShellOption, TerminalStatus } from "./system.types";
import type {
  ProjectSummary
} from "./workspace.types";

export interface AgentSkillEntry {
  id: string;
  name: string;
  description: string | null;
  path: string;
  entryFilePath: string;
  enabled: boolean;
}

export interface AgentSkillCatalog {
  toolId: string;
  supported: boolean;
  rootPath: string | null;
  skills: AgentSkillEntry[];
  sourceLabel: string | null;
  installHint: string | null;
  errorMessage: string | null;
  refreshedAt: string | null;
}

export interface AgentSkillSearchResult {
  toolId: string;
  query: string;
  command: string;
  status: "available" | "error";
  lines: string[];
  rawOutput: string;
  matches: AgentSkillSearchMatch[];
  fetchedAt: string;
}

export interface AgentSkillSearchMatch {
  reference: string;
  installsLabel: string | null;
  url: string | null;
}

export interface AgentSkillInstallOutputEvent {
  toolId: string;
  type: "start" | "line" | "end";
  command?: string;
  line?: string;
  stream?: "stdout" | "stderr" | "system";
  success?: boolean;
}

export interface SessionRecord {
  id: string;
  projectId: string;
  name: string;
  status: "active" | "idle" | "closed" | "error";
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  focusedWorktreeId: string | null;
}

export interface WorkspaceScriptLauncher {
  id: string;
  packageManager: "npm" | "pnpm" | "yarn";
  scriptName: string;
  command: string;
  label: string;
}

export interface WorktreeRecord {
  id: string;
  projectId: string;
  sessionId: string;
  path: string;
  location?: import("./workspace.types").WorkspaceLocation;
  branch: string;
  createdFromRef: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  status: "creating" | "ready" | "removing" | "error";
  writerAgentId: string | null;
  readerAgentIds: string[];
  terminalSessionIds: string[];
  scripts: WorkspaceScriptLauncher[];
}

export type WorktreeTarget =
  | { kind: "session-default"; sessionId?: string }
  | { kind: "root"; sessionId?: string }
  | { kind: "existing"; worktreeId: string }
  | { kind: "new"; forkFromWorktreeId?: string };

export interface RecentProject {
  name: string;
  rootPath: string;
  baseBranch: string;
  lastOpenedAt: string;
}

export interface ChangeEntry {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  diff: string;
}

export interface CommitHistoryEntry {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  authoredAt: string;
}

export interface AgentCatalogEntry {
  id: string;
  label: string;
  aliases: string[];
  launchCommand: string;
  installTemplate: string;
  description: string;
  usageNotes: string[];
  authFields: import("./system.types").AgentAuthField[];
  supportsUsageStatus: boolean;
  usageDashboardUrl: string | null;
  supportsAccountSwitch: boolean;
  detected: boolean;
  enabled: boolean;
  detectedCommand: string | null;
  detectedPath: string | null;
  detectionProbe: string | null;
  detectionStdout: string | null;
  detectionStderr: string | null;
  installStatus: InstallStatus;
  installLog: string[];
  config: import("./system.types").AgentToolConfig;
}

export interface AgentDetectionInfo {
  id: string;
  detected: boolean;
  detectedCommand: string | null;
  detectedPath: string | null;
  detectionProbe: string | null;
  detectionStdout: string | null;
  detectionStderr: string | null;
}

export interface AgentSession {
  id: string;
  projectId: string;
  sessionId: string;
  worktreeId: string;
  mode: AgentMode;
  name: string;
  toolId: string;
  toolLabel: string;
  status: AgentStatus;
  workspace: string;
  branch: string;
  host: string;
  task: string;
  command: string;
  pid: number | null;
  lastEventAt: string;
  lastTerminalLine: string;
  resumeSessionId: string | null;
  resumeCommand: string | null;
  contextFilePath: string;
  terminalStreamPath: string;
  isBusy: boolean;
  busyUntil: string | null;
  terminalOutput: string[];
  rawTerminalOutput: string;
  changeSummary: {
    additions: number;
    deletions: number;
  } | null;
}

export interface TerminalLaunchConfig {
  kind: "blank" | "script";
  command: string;
  label: string;
  scriptName?: string;
  packageManager?: "npm" | "pnpm" | "yarn";
}

export interface TerminalSession {
  id: string;
  projectId: string;
  sessionId: string;
  worktreeId: string;
  name: string;
  status: TerminalStatus;
  isBusy: boolean;
  workspace: string;
  currentWorkingDirectory?: string | null;
  branch: string;
  host: string;
  shellId: string;
  shellLabel: string;
  command: string;
  pid: number | null;
  lastEventAt: string;
  lastTerminalLine: string;
  launchConfig: TerminalLaunchConfig;
  rawTerminalOutput: string;
  detectedLocalUrl: string | null;
  detectedLocalPort: number | null;
  changeSummary: {
    additions: number;
    deletions: number;
  } | null;
}

export interface LocalTerminalState {
  id: string;
  name: string;
  workspace: string;
  shellId: string;
  shellLabel: string;
  command: string;
  status: TerminalStatus;
  pid: number | null;
  lastEventAt: string;
  lastTerminalLine: string;
  rawTerminalOutput: string;
  detectedLocalUrl: string | null;
  detectedLocalPort: number | null;
}

export interface WorkspaceSummary {
  project: ProjectSummary;
  sessions: SessionRecord[];
  worktrees: WorktreeRecord[];
  agents: AgentSession[];
  terminals: TerminalSession[];
}

export interface AppState {
  screen: import("./system.types").Screen;
  project: ProjectSummary | null;
  projectBranches: string[];
  currentSessionId: string | null;
  sessions: SessionRecord[];
  worktrees: WorktreeRecord[];
  workspaces: WorkspaceSummary[];
  recentProjects: RecentProject[];
  focusedAgentId: string | null;
  focusedTerminalId: string | null;
  selectedChangePath: string | null;
  selectedCommitHash: string | null;
  selectedCommit: CommitHistoryEntry | null;
  changesRoot: string | null;
  changes: ChangeEntry[];
  commitHistory: CommitHistoryEntry[];
  activeRemoteMounts: ActiveRemoteMount[];
  projectScripts: WorkspaceScriptLauncher[];
  defaultWorktreePrepareCommand: string | null;
  agents: AgentSession[];
  terminals: TerminalSession[];
  terminalShells: TerminalShellOption[];
  agentCatalog: AgentCatalogEntry[];
  agentSkillCatalogs: AgentSkillCatalog[];
  errorMessage: string | null;
}

export interface AppStateDelta {
  changedAgents: AgentSession[];
  changedTerminals: TerminalSession[];
  errorMessage: string | null;
  focusedAgentId: string | null;
  focusedTerminalId: string | null;
}

export interface CreateAgentPayload {
  toolId: string;
  name: string;
  task: string;
  commandOverride: string;
  mode: AgentMode;
  target: WorktreeTarget;
  contextSelections?: import("./agentContext.types").AgentContextSelection[];
  launchSource?: import("./agentContext.types").AgentPromptSource;
  branchCheckout?: {
    mode: "existing" | "new";
    branchName: string;
  } | null;
  worktreeBranch?: {
    prefix: string;
    name: string;
  } | null;
  prepareWorktree?: boolean;
  prepareCommand?: string;
}

export interface CreateTerminalPayload {
  name: string;
  shellId?: string;
  target: WorktreeTarget;
  launchConfig: TerminalLaunchConfig;
}

export interface ConnectRemoteProjectPayload {
  host: string;
  user?: string;
  port?: number | null;
  remotePath: string;
  alias?: string;
  connectionMode?: "mount" | "ssh";
}

export interface InstallToolPayload {
  toolId: string;
  action: "install" | "remove";
  installCommand: string;
}

export interface SaveToolConfigPayload {
  toolId: string;
  values: Record<string, string>;
}

export interface InstallAgentSkillPayload {
  toolId: string;
  skillReference: string;
}

export interface RemoveAgentSkillPayload {
  toolId: string;
  skillId: string;
}

export interface CommitChangesPayload {
  message: string;
  paths?: string[];
}

export interface AgentContextPreview {
  contextFilePath: string;
  terminalStreamPath: string;
  content: string;
}
