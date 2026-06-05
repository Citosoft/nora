import type { AgentCatalogEntry } from "@shared/appTypes";
import { isAgentToolAvailable } from "@shared/agentToolState";

export function getEnabledStatusBarTools(tools: AgentCatalogEntry[]): AgentCatalogEntry[] {
  return tools.filter((tool) => isAgentToolAvailable(tool));
}

export function getUsagePollingToolIds(tools: AgentCatalogEntry[]): string[] {
  return tools
    .filter((tool) => isAgentToolAvailable(tool) && tool.supportsUsageStatus)
    .map((tool) => tool.id);
}
