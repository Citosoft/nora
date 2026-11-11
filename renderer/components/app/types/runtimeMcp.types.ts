import type { McpRequest, McpResult, McpServer, McpServerLogo } from "@shared/types/provider/mcp.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";

export type McpSelection = Omit<McpRequest, "schemaVersion" | "action">;
export type RuntimeMcpState = { status: "loading" }
  | { status: "loaded"; result: McpResult }
  | { status: "error"; message: string };

/** One provider runtime queried for MCP servers, optionally scoped to a workspace. */
export interface McpProviderSource { key: string; label: string; kind: NativeProvider["kind"]; selection: McpSelection; }
export interface RuntimeMcpEntry { source: McpProviderSource; state: RuntimeMcpState; }
export interface DiscoveredMcpServer { server: McpServer; source: McpProviderSource; }
export interface McpServerTableData { rows: DiscoveredMcpServer[]; availableAccountConnectors: number; }

export type McpLoginHandler = (source: McpProviderSource, serverName: string) => void;
export interface McpServerTableProps { rows: readonly DiscoveredMcpServer[]; onLogin: McpLoginHandler; }
export interface McpServerTableRowProps extends DiscoveredMcpServer { onLogin: McpLoginHandler; }
export interface McpProviderNoticeProps { entry: RuntimeMcpEntry; }
export interface McpServerLogoUrls { light: string; dark: string; }
export interface McpServerLogoProps { logo: McpServerLogo | undefined; }
