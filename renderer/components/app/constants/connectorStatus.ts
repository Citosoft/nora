import type { BadgeProps } from "@/components/ui/badge";
import type { ConnectorStatus } from "@shared/types/connectors/connectors.types";

export const CONNECTOR_STATUS_BADGES: Readonly<Record<ConnectorStatus, { label: string; variant: BadgeProps["variant"] }>> = {
  checking: { label: "Checking", variant: "secondary" }, connected: { label: "Connected", variant: "success" },
  "needs-auth": { label: "Sign-in required", variant: "warning" }, failed: { label: "Failed", variant: "destructive" },
  disabled: { label: "Disabled", variant: "outline" }
};
