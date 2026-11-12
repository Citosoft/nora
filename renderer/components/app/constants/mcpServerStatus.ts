import type { BadgeProps } from "@/components/ui/badge";
import type { McpServer } from "@shared/types/provider/mcp.types";

export const MCP_SERVER_STATUS_BADGES: Readonly<Record<McpServer["status"], { label: string; variant: BadgeProps["variant"] }>> = {
  connected: { label: "Connected", variant: "success" }, pending: { label: "Connecting", variant: "secondary" },
  "needs-auth": { label: "Sign-in required", variant: "warning" }, failed: { label: "Failed", variant: "destructive" },
  disabled: { label: "Disabled", variant: "outline" }, unknown: { label: "Unknown", variant: "outline" }
};
