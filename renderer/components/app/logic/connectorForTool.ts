import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { McpServer } from "@shared/types/provider/mcp.types";

export function connectorForTool({ label, details }: ToolActivity, servers: readonly McpServer[]): McpServer | undefined {
  if (details?.category !== "integration") return undefined;
  const serverName = (details.app?.server ?? details.detail)?.toLowerCase();
  const toolLabel = label.toLowerCase();
  const reported = servers.find(({ name }) => name.toLowerCase() === serverName);
  if (reported) return reported;
  // Claude qualifies tools as mcp__server__tool. Prefer the actual listed tool if names share a prefix.
  const matches = servers.filter(({ name }) => toolLabel.startsWith(`mcp__${name.toLowerCase()}__`));
  return matches.find(({ name, tools }) => tools.some((tool) => toolLabel === `mcp__${name.toLowerCase()}__${tool.name.toLowerCase()}`))
    ?? matches.sort((left, right) => right.name.length - left.name.length)[0];
}
