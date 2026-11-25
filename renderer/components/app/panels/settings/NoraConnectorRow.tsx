import { useId, useState } from "react";
import { CONNECTOR_STATUS_BADGES } from "@/components/app/constants/connectorStatus";
import { ConnectorAccessSummary } from "@/components/app/shared/ConnectorAccessSummary";
import type { NoraConnectorRowProps } from "@/components/app/types/noraConnectors.types";
import { AppMark } from "@/components/app/shared/AppMark";
import { Badge } from "@/components/ui/badge";
import { McpServerLogo } from "./McpServerLogo";
import { McpToolsToggle } from "./McpToolsToggle";
import { McpToolDetailsRow } from "./McpToolDetailsRow";
import { NoraConnectorActions } from "./NoraConnectorActions";
import { McpConnectionErrorRow } from "./McpConnectionErrorRow";

const CELL_CLASS_NAME = "px-3 py-2 align-middle";

/** A connector added in Nora: Nora connects and signs in to it, and adds it to the provider threads its access allows while enabled. */
export function NoraConnectorRow({ connector, controls, accessChoices, onEditAccess }: NoraConnectorRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const status = CONNECTOR_STATUS_BADGES[connector.status];
  const failure = controls.failure(connector.id);
  const error = failure ?? (connector.status === "failed" ? connector.message : undefined);
  const message = [failure, connector.message, `${connector.url} · available to threads as "${connector.serverName}"`].filter(Boolean).join("\n");
  return <>
    <tr className="border-b border-border/40 last:border-0">
      <td className={CELL_CLASS_NAME}>
        <div className="flex min-w-0 items-center gap-2"><McpServerLogo logo={connector.logo} /><span className="break-words font-medium">{connector.name}</span></div>
      </td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>
        <div className="flex items-center gap-2"><AppMark className="size-4 shrink-0" />All providers</div>
      </td>
      <td className={`${CELL_CLASS_NAME} text-muted-foreground`}><ConnectorAccessSummary access={connector.access} choices={accessChoices} /></td>
      <td className={CELL_CLASS_NAME}><Badge variant={failure ? "destructive" : status.variant} className="whitespace-nowrap" title={failure ?? connector.message}>{failure ? "Action failed" : status.label}</Badge></td>
      <td className={CELL_CLASS_NAME}>
        <McpToolsToggle count={connector.tools.length} expanded={expanded} controls={detailsId} serverName={connector.name} onToggle={() => setExpanded((value) => !value)} />
      </td>
      <td className={`${CELL_CLASS_NAME} text-right`}><NoraConnectorActions connector={connector} controls={controls} onEditAccess={onEditAccess} /></td>
    </tr>
    <McpConnectionErrorRow message={error} />
    {expanded ? <McpToolDetailsRow id={detailsId} message={message} tools={connector.tools} /> : null}
  </>;
}
