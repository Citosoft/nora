import type { AgentCatalogEntry, AgentToolConfig } from "./appTypes";

const AGENT_TOOL_ENABLED_KEY = "enabled";

export function isAgentToolEnabled(config: AgentToolConfig | null | undefined): boolean {
  return config?.values[AGENT_TOOL_ENABLED_KEY] !== "false";
}

export function isAgentToolAvailable(
  tool: Pick<AgentCatalogEntry, "detected" | "enabled">
): boolean {
  return tool.detected && tool.enabled;
}

export function withAgentToolEnabled(
  values: Record<string, string>,
  enabled: boolean
): Record<string, string> {
  return {
    ...values,
    [AGENT_TOOL_ENABLED_KEY]: enabled ? "true" : "false"
  };
}
