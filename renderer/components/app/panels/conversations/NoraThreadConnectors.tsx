import { useBotConnectorIds } from "@/components/app/hooks/useBotConnectorIds";
import { AppMark } from "@/components/app/shared/AppMark";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { availableConnectors } from "@shared/connectors/access";
import type { NoraThreadConnectorsProps } from "@/components/app/types/noraConnectors.types";
import { NoraConnectorListItem } from "./NoraConnectorListItem";

/** Connectors added in Nora that this thread gets on its next turn, with a sign-in where one is needed. Hidden when there are none. */
export function NoraThreadConnectors({ subject }: NoraThreadConnectorsProps) {
  const controls = useNoraConnectors();
  const connectorIds = useBotConnectorIds(subject);
  const enabled = availableConnectors(controls.connectors ?? [], subject, connectorIds);
  if (!enabled.length) return null;
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><AppMark className="size-3.5" />Nora connectors
      <span className="font-normal tabular-nums text-muted-foreground">{enabled.length}</span></div>
    <ul className="space-y-1.5" aria-live="polite">
      {enabled.map((connector) => <NoraConnectorListItem key={connector.id} connector={connector} controls={controls} manage={false} />)}
    </ul>
  </div>;
}
