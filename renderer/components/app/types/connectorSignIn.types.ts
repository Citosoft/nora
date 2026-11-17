import type { ConnectorSignInItem } from "@shared/types/conversation/contracts.types";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { McpLoginState } from "./runtimeMcp.types";
import type { ThreadConnectorsState, ThreadConnectorsSummary } from "./threadConnectors.types";

/** What a sign-in card can offer for the requested connector, derived from the thread's live connector discovery. */
export type ConnectorSignInStatus =
  | { kind: "checking" }
  | { kind: "unavailable"; message: string }
  | { kind: "missing" }
  | { kind: "sign-in"; server: McpServer; failure: string | null }
  | { kind: "blocked"; server: McpServer }
  | { kind: "connected"; server: McpServer };

export interface ConnectorSignInStatusInput {
  serverName: string;
  summary: ThreadConnectorsSummary | undefined;
  login: McpLoginState | undefined;
}

export interface ConnectorSignInCardProps {
  item: ConnectorSignInItem;
  /** The thread's connector discovery, shared with thread details so signing in from either place updates both. */
  connectors: ThreadConnectorsState | null;
}

export interface ConnectorSignInActionProps {
  status: ConnectorSignInStatus;
  connectors: ThreadConnectorsState | null;
}
