import { z } from "zod";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "@main/types/execution/mcpApp.types";
import { mcpAppMayCallTool, readMcpAppResource, readMcpAppToolResult, readMcpAppToolVisibility } from "../mcpApp";
import { CodexRpcError } from "./rpcError";
import type { StdioRpc } from "./stdioRpc";

const resourceReadSchema = z.object({ contents: z.array(z.unknown()) }).passthrough();
const toolCallSchema = z.object({ content: z.array(z.json()) }).passthrough();
const serverToolsSchema = z.object({ data: z.array(z.object({ name: z.string(),
  tools: z.record(z.string(), z.object({ name: z.string(), _meta: z.unknown().optional() }).passthrough()) }).passthrough()) }).passthrough();

/** Codex timeline items are identified as `[runId, nativeItemId]`; the native id scopes app resources to their call. */
function codexNativeItemId(itemId: string): string | null {
  try {
    const parsed = z.tuple([z.string(), z.string()]).safeParse(JSON.parse(itemId));
    return parsed.success ? parsed.data[1] : null;
  } catch { return null; }
}

/** MCP Apps lets a server keep a tool from widgets (`visibility` without "app"); unknown tools are refused too. */
async function widgetMayCall(rpc: Pick<StdioRpc, "request">, threadId: string, server: string, tool: string): Promise<boolean> {
  const status = await rpc.request("mcpServerStatus/list", { threadId, serverName: server, detail: "toolsAndAuthOnly", limit: 1 }, serverToolsSchema);
  const descriptor = Object.values(status.data.find((entry) => entry.name === server)?.tools ?? {}).find((entry) => entry.name === tool);
  return !!descriptor && mcpAppMayCallTool(readMcpAppToolVisibility(descriptor._meta));
}

/**
 * Widget requests run on the conversation's own native thread, so the runtime applies that thread's MCP
 * configuration and app scoping. A thread the runtime has unloaded answers with an error until its next turn.
 */
export async function runCodexMcpApp(rpc: Pick<StdioRpc, "request">, threadId: string, action: ProviderMcpAppAction): Promise<ProviderMcpAppResult> {
  try {
    if (action.kind === "read-resource") {
      const response = await rpc.request("mcpServer/resource/read",
        { threadId, server: action.server, uri: action.uri, originCallId: codexNativeItemId(action.itemId) }, resourceReadSchema);
      const resource = readMcpAppResource(response.contents);
      return resource ? { kind: "resource", resource }
        : { kind: "unavailable", message: `${action.server} did not return a widget for this tool.` };
    }
    if (!await widgetMayCall(rpc, threadId, action.server, action.tool)) {
      return { kind: "unavailable", message: `${action.server} does not let widgets call ${action.tool}.` };
    }
    const response = await rpc.request("mcpServer/tool/call",
      { threadId, server: action.server, tool: action.tool, arguments: action.arguments }, toolCallSchema);
    const result = readMcpAppToolResult(response);
    return result ? { kind: "tool-result", result } : { kind: "unavailable", message: `${action.server} returned an unreadable tool result.` };
  } catch (error) {
    return { kind: "unavailable", message: error instanceof CodexRpcError && error.code === -32601
      ? "This Codex runtime cannot run MCP widgets. Update Codex and try again."
      : "Codex could not reach this widget's MCP server. Send another message in the thread, then try again." };
  }
}
