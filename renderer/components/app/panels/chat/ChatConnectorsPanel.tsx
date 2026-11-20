import { useBotConnectorIds } from "@/components/app/hooks/useBotConnectorIds";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { availableConnectors } from "@shared/connectors/access";
import { NoraConnectorListItem } from "@/components/app/panels/conversations/NoraConnectorListItem";
import type { ChatConnectorsPanelProps } from "@/components/app/types/chatPanels.types";

/** The connectors added in Nora that the chat's bot gets in its working workspace, with a sign-in where one is needed. */
export function ChatConnectorsPanel({ subject }: ChatConnectorsPanelProps) {
  const controls = useNoraConnectors();
  const connectorIds = useBotConnectorIds(subject);
  const connectors = controls.connectors ? availableConnectors(controls.connectors, subject, connectorIds) : null;
  return <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 text-xs">
    {controls.loadError && <p role="alert" className="text-destructive">{controls.loadError}</p>}
    {!connectors && !controls.loadError && <p role="status" className="text-muted-foreground">Loading connectors…</p>}
    {connectors && !connectors.length && <p className="text-muted-foreground">No connectors are available to this bot here. Choose connectors in the bot editor, or add one in Settings → MCP Servers.</p>}
    {connectors && connectors.length > 0 && <ul className="space-y-1.5" aria-label="Connectors available to this bot" aria-live="polite">
      {connectors.map((connector) => <NoraConnectorListItem key={connector.id} connector={connector} controls={controls} manage={false} />)}
    </ul>}
  </div>;
}
