import type { AgentCatalogEntry, AgentToolConfig } from "@shared/appTypes";
import type { CliStatusCapture } from "../types/agent-usage/toolUsageInfo.types";
import { getInteractiveCodexStatusFromDeps, getToolEnvFromConfigs } from "./runtimeFacade";

export class ToolingRuntimeService {
  constructor(private readonly getToolConfigs: () => Record<string, AgentToolConfig>) {}

  getToolEnv(toolId: string): Record<string, string> {
    return getToolEnvFromConfigs(this.getToolConfigs(), toolId);
  }

  async getInteractiveCodexStatus(tool: AgentCatalogEntry): Promise<CliStatusCapture> {
    return getInteractiveCodexStatusFromDeps({
      tool,
      getToolEnv: (toolId) => this.getToolEnv(toolId)
    });
  }
}
