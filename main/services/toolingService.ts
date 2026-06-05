import type { ToolingService } from "../types/mainServices.types";

type ToolingServiceDeps = {
  refreshCatalog: ToolingService["refreshCatalog"];
  scheduleCatalogRefresh: ToolingService["scheduleCatalogRefresh"];
  installAgentTool: ToolingService["installAgentTool"];
  searchToolSkills: ToolingService["searchToolSkills"];
  installToolSkill: ToolingService["installToolSkill"];
  removeToolSkill: ToolingService["removeToolSkill"];
  saveToolConfig: ToolingService["saveToolConfig"];
  getToolUsage: ToolingService["getToolUsage"];
  switchToolAccount: ToolingService["switchToolAccount"];
};

export function createToolingService(deps: ToolingServiceDeps): ToolingService {
  return {
    refreshCatalog: deps.refreshCatalog,
    scheduleCatalogRefresh: deps.scheduleCatalogRefresh,
    installAgentTool: deps.installAgentTool,
    searchToolSkills: deps.searchToolSkills,
    installToolSkill: deps.installToolSkill,
    removeToolSkill: deps.removeToolSkill,
    saveToolConfig: deps.saveToolConfig,
    getToolUsage: deps.getToolUsage,
    switchToolAccount: deps.switchToolAccount
  };
}
