import { describeConnectorAccess, summarizeConnectorAccess } from "@/components/app/logic/connectorAccess";
import type { ConnectorAccessSummaryProps } from "@/components/app/types/noraConnectors.types";
import { ConnectorAccessChoiceIcon } from "./ConnectorAccessChoiceIcon";

const STACK_LIMIT = 3;

/** Where a connector is available, with the chosen workspaces' and bots' icons: "Everywhere", or each limit's picks and label. */
export function ConnectorAccessSummary({ access, choices }: ConnectorAccessSummaryProps) {
  const parts = summarizeConnectorAccess(access, choices);
  if (!parts.length) return <span>Everywhere</span>;
  return <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1" title={describeConnectorAccess(access, choices)}>
    {parts.map((part) => <span key={part.label} className="inline-flex min-w-0 items-center gap-1.5">
      {part.choices.length ? <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
        {part.choices.slice(0, STACK_LIMIT).map((choice) => <span key={choice.id} className="rounded-md ring-2 ring-background"><ConnectorAccessChoiceIcon choice={choice} /></span>)}
      </span> : null}
      <span className="truncate">{part.label}</span>
    </span>)}
  </span>;
}
