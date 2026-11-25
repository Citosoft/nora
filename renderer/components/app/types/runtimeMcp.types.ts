import type { NoraToolsStatus } from "@shared/types/nora-tools/noraTools.types";
import type { McpRequest, McpResult, McpServer, McpServerLogo } from "@shared/types/provider/mcp.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ConnectorAccessChoices, NoraConnectors } from "@/components/app/types/noraConnectors.types";
import type { Connector } from "@shared/types/connectors/connectors.types";

export type McpSelection = Omit<McpRequest, "schemaVersion" | "action">;
export type RuntimeMcpState = { status: "loading" }
  | { status: "loaded"; result: McpResult }
  | { status: "error"; message: string };

/** One provider runtime queried for MCP servers, optionally scoped to a workspace. */
export interface McpProviderSource { key: string; label: string; kind: NativeProvider["kind"]; selection: McpSelection; }
export interface RuntimeMcpEntry { source: McpProviderSource; state: RuntimeMcpState; }
export interface DiscoveredMcpServer { server: McpServer; source: McpProviderSource; }
export interface McpServerTableData { rows: DiscoveredMcpServer[]; availableAccountConnectors: number; }

/** A sign-in started from Nora: waiting on the browser and runtime, or failed with a reason. Absent when none is in progress. */
export type McpLoginState = { status: "pending" } | { status: "failed"; message: string };
export interface McpLoginControls {
  state(source: McpProviderSource, serverName: string): McpLoginState | undefined;
  start(source: McpProviderSource, serverName: string): void;
}
export interface McpServerTableProps {
  rows: readonly DiscoveredMcpServer[];
  logins: McpLoginControls;
  builtIn: NoraToolsStatus;
  connectors: NoraConnectors;
  accessChoices: ConnectorAccessChoices;
  onEditConnectorAccess(connector: Connector): void;
}
export interface NoraMcpServerRowProps { status: NoraToolsStatus; }
export interface McpToolsToggleProps { count: number; expanded: boolean; controls: string; serverName: string; onToggle(): void; }
export interface McpToolDetailsRowProps { id: string; message?: string; tools: readonly { name: string; description?: string }[]; }
export interface McpConnectionErrorRowProps { message: string | undefined; }
export interface McpServerTableRowProps extends DiscoveredMcpServer { logins: McpLoginControls; }
export interface McpLoginButtonProps extends DiscoveredMcpServer { logins: McpLoginControls; compact?: boolean; }
export interface McpProviderNoticeProps { entry: RuntimeMcpEntry; }
export interface McpServerLogoUrls { light: string; dark: string; }
/** `small` fits inline controls such as the composer's connector pill; `default` suits lists and tables. */
export interface McpServerLogoProps { logo: McpServerLogo | undefined; size?: "default" | "small"; }
