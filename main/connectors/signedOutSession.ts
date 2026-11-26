import { getJsonObject, getNumber, getString, type JsonObject } from "@main/jsonValue";
import type { McpTool } from "@shared/types/provider/mcp.types";
import type { StoredConnector } from "@main/types/connectors/connectors.types";
import type { GatewayLocalReply, GatewayRpcMessage, GatewayRpcReply, GatewayRpcRequest } from "@main/types/connectors/gatewaySession.types";

/** Requests that act through a connector for the model. Only these are worth interrupting the user for a sign-in. */
const USE_METHODS = new Set(["tools/call", "resources/read", "prompts/get"]);
export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";
/** Listed when Nora has never seen the connector's tools, so the model still has a way to ask the user to sign in. */
export const SIGN_IN_TOOL = "sign_in";

export function parseRpcRequest(body: Buffer | undefined): GatewayRpcRequest {
  if (!body?.length) return { batch: false, messages: [] };
  let parsed: unknown;
  try { parsed = JSON.parse(body.toString("utf8")); } catch { return { batch: false, messages: [] }; }
  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  const batch = Array.isArray(parsed);
  const messages = entries.flatMap((value: unknown): GatewayRpcMessage[] => {
    const message = getJsonObject(value);
    const method = getString(message?.method);
    // Messages without a method are the runtime's responses to server requests; they never need a sign-in.
    if (!message || !method) return [];
    const id = getString(message.id) ?? getNumber(message.id);
    const params = getJsonObject(message.params);
    return [{ method, ...(id !== null ? { id } : {}), ...(params ? { params } : {}) }];
  });
  return { batch, messages };
}

/** True when the request needs the connector itself rather than the handshake or tool listing a runtime does at start-up. */
export const usesConnector = (request: GatewayRpcRequest): boolean => request.messages.some((message) => USE_METHODS.has(message.method));

/** A call to the stand-in sign-in tool, which only exists while the connector's real tools are unknown. */
export function isSignInToolCall(request: GatewayRpcRequest, tools: readonly McpTool[]): boolean {
  const [message] = request.messages;
  return request.messages.length === 1 && message?.method === "tools/call" && getString(message.params?.name) === SIGN_IN_TOOL
    && !tools.some((tool) => tool.name === SIGN_IN_TOOL);
}

function listedTools(connector: StoredConnector, tools: readonly McpTool[]): JsonObject[] {
  if (tools.length === 0) {
    return [{ name: SIGN_IN_TOOL, description: `Ask the user to sign in to ${connector.name} so its tools can be used. Call this only when the task needs ${connector.name}.`,
      inputSchema: { type: "object", properties: {} } }];
  }
  return tools.map((tool) => ({ name: tool.name, ...(tool.description ? { description: tool.description } : {}), inputSchema: tool.inputSchema ?? { type: "object" } }));
}

function answer(message: GatewayRpcMessage, id: string | number, connector: StoredConnector, tools: readonly McpTool[]): GatewayRpcReply {
  switch (message.method) {
    case "initialize":
      return { jsonrpc: "2.0", id, result: {
        protocolVersion: getString(message.params?.protocolVersion) ?? DEFAULT_MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: connector.serverName, version: "1.0.0" },
        instructions: `${connector.name} is not signed in. Calling one of its tools asks the user to sign in first.`
      } };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: listedTools(connector, tools) } };
    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `${connector.name} is not signed in.` } };
  }
}

function replyTo(request: GatewayRpcRequest, reply: (message: GatewayRpcMessage, id: string | number) => GatewayRpcReply): GatewayLocalReply {
  const replies = request.messages.flatMap((message) => message.id === undefined ? [] : [reply(message, message.id)]);
  const [single] = replies;
  if (!single) return { status: 202 };
  return { status: 200, body: request.batch ? replies : single };
}

/**
 * Answers a runtime's start-up traffic for a signed-out connector without bothering the user: the handshake succeeds and lists
 * the tools Nora last saw (or a sign-in tool), so the authorize card only appears once the model actually calls the connector.
 */
export function signedOutReply(method: string, request: GatewayRpcRequest, connector: StoredConnector, tools: readonly McpTool[]): GatewayLocalReply {
  // No server-to-client stream while signed out; a session-less DELETE has nothing to end.
  if (method === "GET") return { status: 405 };
  if (method === "DELETE") return { status: 200 };
  return replyTo(request, (message, id) => answer(message, id, connector, tools));
}

/** Result of the stand-in sign-in tool once the user has signed in; the runtime only sees the real tools on its next connect. */
export const signInToolReply = (request: GatewayRpcRequest, connector: StoredConnector): GatewayLocalReply => replyTo(request, (_message, id) => ({
  jsonrpc: "2.0", id,
  result: { content: [{ type: "text", text: `Signed in to ${connector.name}. Its tools become available from the next message.` }] }
}));
