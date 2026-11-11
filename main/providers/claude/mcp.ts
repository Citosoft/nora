import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { McpResult, McpServer } from "@shared/types/provider/mcp.types";
import { withClaudeControlSession } from "./controlSession";

export function normalizeClaudeMcp(server: McpServerStatus): McpServer {
  return { name: server.name, status: server.status,
    authStatus: server.status === "needs-auth" ? "needs-auth" : "unknown", canLogin: false,
    tools: (server.tools ?? []).map((tool) => ({ name: tool.name, ...(tool.description ? { description: tool.description } : {}) })),
    ...(server.status === "failed" ? { message: "The runtime could not connect. Check the server configuration and sign-in in Claude Code." } : {}) };
}

export function createClaudeMcpReader(runtime: ClaudeRuntimeOptions): (cwd: string) => Promise<McpResult> {
  return async (cwd) => {
    try {
      return await withClaudeControlSession(runtime, cwd, async (session) => ({ kind: "servers",
        servers: (await session.mcpServerStatus()).map(normalizeClaudeMcp) }));
    } catch {
      return { kind: "unavailable", message: "Claude MCP discovery is unavailable. Check the configured runtime, its MCP settings and authentication, then refresh." };
    }
  };
}
