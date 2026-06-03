import type {
  AgentSkillInstallOutputEvent,
  InstallAgentSkillPayload,
  InstallToolPayload,
  RemoveAgentSkillPayload,
  SaveToolConfigPayload
} from "@shared/appTypes";
import type { ToolingHelpers } from "../../types/orchestratorTooling.types";
import type { ToolingService } from "../../types/mainServices.types";

export class ToolingMainService implements ToolingService {
  constructor(private readonly helpers: ToolingHelpers) {}

  refreshCatalog = (options?: import("../../types/agentDetectionCache.types").RefreshCatalogOptions): ReturnType<ToolingHelpers["refreshCatalog"]> =>
    this.helpers.refreshCatalog(options);

  scheduleCatalogRefresh = (): void => this.helpers.scheduleCatalogRefresh();

  installAgentTool = (payload: InstallToolPayload) => this.helpers.installAgentTool(payload);

  searchToolSkills = (toolId: string, query: string) => this.helpers.searchToolSkills(toolId, query);

  installToolSkill = (
    payload: InstallAgentSkillPayload,
    onOutput?: (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void
  ) => this.helpers.installToolSkill(payload, onOutput);

  removeToolSkill = (payload: RemoveAgentSkillPayload) => this.helpers.removeToolSkill(payload);

  saveToolConfig = (payload: SaveToolConfigPayload) => this.helpers.saveToolConfig(payload);

  getToolUsage = (toolId: string) => this.helpers.getToolUsage(toolId);

  switchToolAccount = (toolId: string) => this.helpers.switchToolAccount(toolId);
}
