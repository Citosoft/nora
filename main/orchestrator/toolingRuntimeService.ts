import type { AgentCatalogEntry, AgentToolConfig, ToolUsageInfo } from "@shared/appTypes";
import { getInteractiveCodexStatusFromDeps, getToolEnvFromConfigs } from "./runtimeFacade";
import { nowIso } from "./time";

export class ToolingRuntimeService {
  constructor(private readonly getToolConfigs: () => Record<string, AgentToolConfig>) {}

  getToolEnv(toolId: string): Record<string, string> {
    return getToolEnvFromConfigs(this.getToolConfigs(), toolId);
  }

  async getInteractiveCodexStatus(title: string, tool: AgentCatalogEntry): Promise<ToolUsageInfo> {
    return getInteractiveCodexStatusFromDeps({
      title,
      tool,
      nowIso,
      getToolEnv: (toolId) => this.getToolEnv(toolId)
    });
  }
}
