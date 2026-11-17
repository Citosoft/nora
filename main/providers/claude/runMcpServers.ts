import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { mcpAuthorization } from "@main/nora-tools/endpoint";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

/** Maps the servers Nora adds to a run onto Claude's options; trusted tools run without an approval prompt. */
export function claudeMcpServersConfig(servers: readonly RunMcpServer[]): Pick<Options, "mcpServers" | "allowedTools"> {
  return servers.length ? { mcpServers: Object.fromEntries(servers.map((server) =>
    [server.name, { type: "http" as const, url: server.url, headers: { Authorization: mcpAuthorization(server) } }])),
    allowedTools: servers.flatMap((server) => (server.trustedTools ?? []).map((tool) => `mcp__${server.name}__${tool}`)) } : {};
}
