import type { AgentCatalogEntry } from "@shared/appTypes";
import { isAgentToolAvailable } from "@shared/agentToolState";

export function getEnabledStatusBarTools(tools: AgentCatalogEntry[]): AgentCatalogEntry[] {
  return tools.filter((tool) => isAgentToolAvailable(tool));
}
