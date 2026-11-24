import type { Conversation, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { McpLoginControls, McpProviderSource } from "@/components/app/types/runtimeMcp.types";

/** MCP connectors the thread's provider runtime has enabled for the thread's checkout. */
export type ThreadConnectorsSummary =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; servers: McpServer[]; notice: string | null };

/** A draft's side of connector discovery: its saved provider pick, the binding it would send with, and its workspace. */
export interface ThreadConnectorsDraft {
  provider: ProviderBinding | null;
  readyBinding: ProviderBinding | null;
  workspace: WorkspaceRef;
}

/** Which of the runtime account's connectors a thread gets: all of them, or only the named ones (a bot's choice; none for chats). */
export type AccountConnectorAccess = { kind: "all" } | { kind: "only"; names: readonly string[] };
export interface ThreadConnectorsInput {
  conversation: Pick<Conversation, "provider" | "workspace">;
  providerLabel: string;
  accountConnectors: AccountConnectorAccess;
}


export interface ThreadConnectorsState {
  source: McpProviderSource;
  summary: ThreadConnectorsSummary;
  logins: McpLoginControls;
  refresh(): void;
}

export interface ThreadConnectorsProps { connectors: ThreadConnectorsState; }
/** `preview` keeps thread details compact behind a "more" popover; `full` lists every connector, for surfaces that scroll. */
export interface ThreadConnectorsStatusProps { connectors: ThreadConnectorsState; layout: "preview" | "full"; }

export interface ThreadConnectorRowProps {
  server: McpServer;
  source: McpProviderSource;
  logins: McpLoginControls;
}

export interface ThreadConnectorListProps {
  servers: readonly McpServer[];
  source: McpProviderSource;
  logins: McpLoginControls;
}
