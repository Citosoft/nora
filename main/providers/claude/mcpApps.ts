import { z } from "zod";
import type { McpServerStatus, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeMcpAppLookup, ClaudeMcpAppTool, ClaudeOptions, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { McpAppCallSource } from "@main/types/execution/mcpApp.types";
import { readMcpAppResource, readMcpAppToolUi } from "../mcpApp";
import { withClaudeControlSession } from "./controlSession";
import { claudeToolCallSchema } from "./toolSchemas";

/** The runtime capability that says server status carries tools' MCP Apps `_meta`. */
export const CLAUDE_MCP_TOOL_UI_CAPABILITY = "mcp_tool_ui_meta_v1";

/** Claude names MCP tools `mcp__<server>__<tool>`, replacing characters outside `[A-Za-z0-9_-]` in either part. */
function claudeMcpToolName(server: string, tool: string): string {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_");
  return `mcp__${safe(server)}__${safe(tool)}`;
}

/** Built from the real server list, so server names that contain `__` still resolve. */
export function claudeMcpAppLookup(servers: readonly McpServerStatus[]): ClaudeMcpAppLookup {
  const tools = new Map<string, ClaudeMcpAppTool>();
  for (const server of servers) {
    for (const tool of server.tools ?? []) {
      const ui = readMcpAppToolUi(tool._meta);
      if (ui) tools.set(claudeMcpToolName(server.name, tool.name), { server: server.name, tool: tool.name, ui });
    }
  }
  return (toolName) => tools.get(toolName) ?? null;
}

/** Whether a message calls an MCP tool, so widget metadata must be resolved before it is normalized. */
export function callsClaudeMcpTool(message: SDKMessage): boolean {
  const blocks = message.type === "assistant" ? message.message.content
    : message.type === "stream_event" && message.event.type === "content_block_start" ? [message.event.content_block] : [];
  return blocks.some((block) => {
    const call = claudeToolCallSchema.safeParse(block);
    return call.success && call.data.name.startsWith("mcp__");
  });
}

const callResultSchema = z.object({ content: z.array(z.json()), structuredContent: z.json().optional(), isError: z.boolean().optional() });
const contentBlocksSchema = z.array(z.json()).refine((blocks) => blocks.every((block) =>
  block !== null && typeof block === "object" && !Array.isArray(block) && typeof block.type === "string"));

/**
 * The raw MCP result for a widget: the SDK's `tool_use_result` when it kept the server's shape,
 * otherwise the content blocks the model received.
 */
export function claudeMcpAppResult(toolUseResult: unknown, content: unknown): McpAppCallSource["result"] {
  const raw = callResultSchema.safeParse(toolUseResult);
  if (raw.success) return raw.data;
  const blocks = contentBlocksSchema.safeParse(toolUseResult);
  if (blocks.success) return { content: blocks.data };
  const fallback = contentBlocksSchema.safeParse(content);
  if (fallback.success) return { content: fallback.data };
  return typeof content === "string" ? { content: [{ type: "text", text: content }] } : null;
}

/** Reads widget documents on a control session that adds the conversation's own servers, without a model turn. */
export function createClaudeMcpAppReader(runtime: ClaudeRuntimeOptions): NonNullable<ClaudeOptions["readMcpAppResource"]> {
  // Runtimes without `mcp_read_resource_v1` reject the request; the adapter reports that as unavailable.
  return (cwd, servers, server, uri) => withClaudeControlSession(runtime, cwd,
    async (session) => readMcpAppResource((await session.readMcpResource(server, uri)).contents), undefined, servers);
}
