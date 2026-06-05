import type {
  ActiveRemoteMount,
  AgentCatalogEntry,
  AgentSession,
  AgentSkillInstallOutputEvent,
  AgentToolConfig,
  ConnectRemoteProjectPayload,
  LocalTerminalState,
  OAuthProvider,
  ProjectSummary,
  RemoteMountSupport,
  SessionRecord,
  TerminalSession,
  WorkspaceLocation,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorktreeRecord
} from "@shared/appTypes";

export type AgentExecutablePathCandidate = {
  path: string;
  platforms?: NodeJS.Platform[];
};

export type AgentDefinition = Omit<
  AgentCatalogEntry,
  "detected" | "enabled" | "detectedCommand" | "detectedPath" | "detectionProbe" | "detectionStdout" | "detectionStderr" | "installStatus" | "installLog" | "config"
> & {
  executablePathCandidates: AgentExecutablePathCandidate[];
  windowsLaunchCommand?: string;
  skillCatalog?:
    | {
        rootDir: string;
        entryFileName: string;
        sourceLabel: string;
        installHint: string;
      }
    | null;
};

export type AgentSkillCatalogConfig = {
  rootDir: string;
  entryFileName: string;
  sourceLabel: string;
  installHint: string;
};

export type SkillsCommandCandidate = {
  label: string;
  executable: string;
  argsPrefix: string[];
};

export type SkillsCommandExecution = {
  command: string;
  stdout: string;
  stderr: string;
};

export type SkillInstallReporter = (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void;

export type ProviderRuntimeConfig = {
  provider: OAuthProvider;
  label: string;
  host: string;
  clientId: string;
  tokenUrl: string;
  scopes: string[];
  userUrl: string;
};

export type IdeDefinition = {
  id: string;
  name: string;
  windowsExecutables?: string[];
  windowsCandidates?: string[];
  windowsPathCommands?: string[];
  windowsJetBrainsMatchers?: string[];
  macExecutables?: string[];
  linuxExecutables?: string[];
  linuxCandidates?: string[];
  linuxPathCommands?: string[];
};

export type GithubReleaseResponse = {
  tag_name?: unknown;
  html_url?: unknown;
};

export type GithubReleaseAssetApiResponse = {
  name?: unknown;
  browser_download_url?: unknown;
  size?: unknown;
  content_type?: unknown;
};

export type GithubLatestReleaseApiResponse = GithubReleaseResponse & {
  assets?: unknown;
};

export type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
};

export type WorkspaceTarget = {
  path: string;
  location?: WorkspaceLocation;
};

export type WorkspaceGitExec = (
  target: WorkspaceTarget,
  args: string[],
  maxBuffer?: number
) => Promise<{ stdout: string; stderr: string }>;

export type RuntimeSession = {
  pid: number | null;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
};

export type VercelTeamRecord = {
  id: string;
  slug: string | null;
  name: string | null;
};

export interface OrchestratorOptions {
  recentProjectsPath: string;
  toolConfigPath: string;
  projectsIndexPath: string;
  sessionsIndexPath: string;
  onWorkspaceLoadingProgress?: (payload: { projectId: string; detail: string; command: string | null }) => void;
  onLocalTerminalChanged?: (state: LocalTerminalState | null) => void;
}

export type MountResult = {
  mountPoint: string;
  mountedUnc: string;
};

export type RemoteMountReporter = (line: string) => void;

export type RemoteMountAdapter = {
  detectSupport: () => Promise<RemoteMountSupport>;
  readActiveMounts: () => Promise<ActiveRemoteMount[]>;
  mount: (payload: ConnectRemoteProjectPayload, reporter?: RemoteMountReporter) => Promise<MountResult>;
  unmount: (mountPoint: string) => Promise<void>;
};

export interface PersistedSessionState {
  session: SessionRecord;
  projectId: string;
  focusedAgentId: string | null;
  focusedTerminalId: string | null;
  selectedChangePath: string | null;
  selectedCommitHash: string | null;
  agents: AgentSession[];
  terminals: TerminalSession[];
  worktrees: WorktreeRecord[];
}

export interface SessionIndexEntry {
  sessionId: string;
  projectId: string;
  name: string;
  status: SessionRecord["status"];
  updatedAt: string;
  lastUsedAt: string;
}

export type NormalizedTaskBoard = {
  board: WorkspaceTaskBoard;
  changed: boolean;
};

export type StoredToolConfigs = Record<string, AgentToolConfig>;

export type NormalizedWorkspaceSplitViewCollection = {
  collection: WorkspaceSplitViewCollection;
  changed: boolean;
};

export interface PersistedWorkspaceState {
  project: ProjectSummary | null;
  focusedAgentId: string | null;
  selectedChangePath: string | null;
  agents: AgentSession[];
}
