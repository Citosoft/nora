import type {
  AgentSkillInstallOutputEvent,
  AgentSkillSearchResult,
  AppState,
  InstallAgentSkillPayload,
  InstallToolPayload,
  ListAiModelsPayload,
  ListAiModelsResult,
  RemoveAgentSkillPayload,
  SaveToolConfigPayload,
  ToolUsageInfo
} from "../../appTypes";
import type { ProviderUpdateNotice } from "../../types/provider/update.types";

export interface ToolingBridge {
  refreshCatalog: () => Promise<AppState>;
  /** Lists detected provider CLIs that are behind their latest published release. */
  checkProviderUpdates: () => Promise<ProviderUpdateNotice[]>;
  installTool: (payload: InstallToolPayload) => Promise<AppState>;
  removeTool: (payload: InstallToolPayload) => Promise<AppState>;
  searchToolSkills: (toolId: string, query: string) => Promise<AgentSkillSearchResult>;
  installToolSkill: (payload: InstallAgentSkillPayload) => Promise<AppState>;
  removeToolSkill: (payload: RemoveAgentSkillPayload) => Promise<AppState>;
  saveToolConfig: (payload: SaveToolConfigPayload) => Promise<AppState>;
  getToolUsage: (toolId: string) => Promise<ToolUsageInfo | null>;
  switchToolAccount: (toolId: string) => Promise<void>;
  onToolSkillInstallOutput: (listener: (payload: AgentSkillInstallOutputEvent) => void) => () => void;
  listAiModels: (payload: ListAiModelsPayload) => Promise<ListAiModelsResult>;
}

export interface ToolingGateway extends ToolingBridge {}
