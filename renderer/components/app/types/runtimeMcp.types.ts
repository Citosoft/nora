import type { McpRequest, McpResult, McpServer } from "@shared/types/provider/mcp.types";

export type McpSelection = Omit<McpRequest, "schemaVersion" | "action">;
export type RuntimeMcpState = { status: "loading" }
  | { status: "loaded"; result: McpResult }
  | { status: "error"; message: string };

export interface McpServerRowProps { server: McpServer; onLogin(serverName: string): void; }
