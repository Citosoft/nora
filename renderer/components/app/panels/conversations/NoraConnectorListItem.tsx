import { CONNECTOR_STATUS_BADGES } from "@/components/app/constants/connectorStatus";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import { NoraConnectorActions } from "@/components/app/panels/settings/NoraConnectorActions";
import type { NoraConnectorListItemProps } from "@/components/app/types/noraConnectors.types";
import { Badge } from "@/components/ui/badge";

/** A connector in a dense list: its sign-in while one is needed, otherwise its tool count or status. */
export function NoraConnectorListItem({ connector, controls, manage, onEditAccess }: NoraConnectorListItemProps) {
  const status = CONNECTOR_STATUS_BADGES[connector.status];
  const tools = `${connector.tools.length} ${connector.tools.length === 1 ? "tool" : "tools"}`;
  const needsAction = connector.status === "needs-auth" || controls.pending(connector.id) === "sign-in";
  return <li className="flex min-h-6 min-w-0 items-center gap-2" title={controls.failure(connector.id) ?? connector.message ?? `${connector.name} · ${tools}`}>
    <McpServerLogo logo={connector.logo} />
    <span className="min-w-0 flex-1 truncate">{connector.name}</span>
    {needsAction ? null : connector.status === "connected"
      ? <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">{tools}</span>
      : <Badge variant={status.variant} className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[10px]">{status.label}</Badge>}
    {needsAction || manage ? <NoraConnectorActions connector={connector} controls={controls} compact menu={manage} onEditAccess={onEditAccess} /> : null}
  </li>;
}
