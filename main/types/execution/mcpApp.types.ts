import type { McpAppDisplayMode, McpAppToolResult } from "@shared/types/conversation/mcpApp.types";
import type { McpAppPermissions } from "@shared/types/provider/mcpApp.types";
import type { JsonValue } from "./json.types";

/** The MCP Apps members of a tool descriptor's `_meta`, after validation. */
export interface McpAppToolUi {
  resourceUri: string;
  /** Who may call the tool; an empty list means the server declared neither audience. */
  visibility: ("model" | "app")[] | null;
}
/** Everything a provider knows about one widget-bearing tool call before it is bounded for the transcript. */
export interface McpAppCallSource {
  server: string;
  tool: string;
  resourceUri: string;
  displayMode?: McpAppDisplayMode;
  input?: JsonValue;
  result?: { content: JsonValue[]; structuredContent?: JsonValue | null; isError?: boolean | null } | null;
}
/** Origins a widget declared it needs (MCP Apps `ui.csp`); only https origins survive validation. */
export interface McpAppCsp {
  connectDomains: string[];
  resourceDomains: string[];
  frameDomains: string[];
  baseUriDomains: string[];
}
/** A widget's HTML and the sandbox it asked for, validated at the provider boundary. */
export interface McpAppResource {
  html: string;
  csp: McpAppCsp;
  permissions: McpAppPermissions;
  prefersBorder?: boolean;
}
export type ProviderMcpAppAction =
  /** `itemId` is the tool item the widget belongs to; each provider recovers its native call id from it. */
  | { kind: "read-resource"; server: string; uri: string; itemId: string }
  | { kind: "call-tool"; server: string; tool: string; arguments: Record<string, JsonValue> };
export type ProviderMcpAppResult =
  | { kind: "resource"; resource: McpAppResource }
  | { kind: "tool-result"; result: McpAppToolResult }
  | { kind: "unavailable"; message: string };
/** A served widget document, held in memory under a single-use token. */
export interface McpAppFrame {
  html: string;
  csp: McpAppCsp;
  expiresAt: number;
}
/** The host's answer to a widget request; a resource also says whether the runtime runs the widget's own tool calls. */
export type McpAppHostResult =
  | Exclude<ProviderMcpAppResult, { kind: "resource" }>
  | { kind: "resource"; resource: McpAppResource; toolCalls: boolean };
/** Serves widget documents on their own origins; `respond` answers only URLs it issued. */
export interface McpAppFrameServer {
  register(resource: McpAppResource): string;
  respond(url: URL): Response | null;
}
