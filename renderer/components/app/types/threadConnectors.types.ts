import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { McpLoginControls, McpProviderSource } from "@/components/app/types/runtimeMcp.types";

/** MCP connectors the thread's provider runtime has enabled for the thread's checkout. */
export type ThreadConnectorsSummary =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; servers: McpServer[]; notice: string | null };

export interface ThreadConnectorsInput {
  conversation: Pick<Conversation, "provider" | "workspace">;
  providerLabel: string;
}


export interface ThreadConnectorsState {
  source: McpProviderSource;
  summary: ThreadConnectorsSummary;
  logins: McpLoginControls;
  refresh(): void;
}

export interface ThreadConnectorsProps { connectors: ThreadConnectorsState; }

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
