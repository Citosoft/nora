import type {
  AgentCatalogEntry,
  AgentDetectionInfo,
  AgentSkillCatalog,
  AgentSkillInstallOutputEvent,
  AgentSkillSearchResult,
  AgentToolConfig,
  AppState,
  InstallAgentSkillPayload,
  InstallToolPayload,
  ProjectSummary,
  RemoveAgentSkillPayload,
  SaveToolConfigPayload,
  ToolUsageInfo
} from "@shared/appTypes";

export interface ToolingHelperDeps {
  nowIso: () => string;
  detectRemoteAgentCatalog: (target: import("./internal.types").WorkspaceTarget) => Promise<AgentDetectionInfo[]>;
  detectLocalAgentCatalog: () => Promise<AgentDetectionInfo[]>;
  buildAgentCatalog: (
    detections: AgentDetectionInfo[],
    existingCatalog: AgentCatalogEntry[],
    toolConfigs: Record<string, AgentToolConfig>
  ) => AgentCatalogEntry[];
  getToolConfigs: () => Record<string, AgentToolConfig>;
  readAgentSkillCatalogs: (toolIds: string[]) => Promise<AgentSkillCatalog[]>;
  sharedAgentSkillsToolId: string;
  getSnapshot: () => AppState;
  getProjectTarget: (project: ProjectSummary) => import("./internal.types").WorkspaceTarget;
  saveProject: (project: ProjectSummary) => Promise<void>;
  updateState: (updater: (state: AppState) => AppState) => void;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  getDefaultToolCommand: (tool: AgentCatalogEntry, action: InstallToolPayload["action"]) => string | null | undefined;
  getInstallCommandExecution: (command: string) => { executable: string; args: string[] };
  maxInstallLogLines: number;
  hasInstallSession: (toolId: string) => boolean;
  setInstallSession: (toolId: string, child: import("node:child_process").ChildProcessWithoutNullStreams) => void;
  deleteInstallSession: (toolId: string) => void;
  updateCatalogTool: (toolId: string, partial: Partial<AgentCatalogEntry>) => void;
  refreshCatalog: () => Promise<AppState>;
  installAgentSkill: (
    toolId: string,
    skillReference: string,
    onOutput?: (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void
  ) => Promise<AgentSkillCatalog>;
  removeAgentSkill: (toolId: string, skillId: string) => Promise<AgentSkillCatalog>;
  updateAgentSkillCatalog: (catalog: AgentSkillCatalog) => void;
  saveToolConfigStore: (toolId: string, values: Record<string, string>) => Promise<Record<string, AgentToolConfig>>;
  setToolConfigs: (configs: Record<string, AgentToolConfig>) => void;
  getCliToolStatus: (tool: AgentCatalogEntry) => Promise<ToolUsageInfo | null>;
  searchAgentSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
}

export interface ToolingHelpers {
  refreshCatalog: () => Promise<AppState>;
  installAgentTool: (payload: InstallToolPayload) => Promise<AppState>;
  installToolSkill: (
    payload: InstallAgentSkillPayload,
    onOutput?: (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void
  ) => Promise<AppState>;
  removeToolSkill: (payload: RemoveAgentSkillPayload) => Promise<AppState>;
  saveToolConfig: (payload: SaveToolConfigPayload) => Promise<AppState>;
  getToolUsage: (toolId: string) => Promise<ToolUsageInfo | null>;
  switchToolAccount: (toolId: string) => Promise<void>;
  searchToolSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
}
