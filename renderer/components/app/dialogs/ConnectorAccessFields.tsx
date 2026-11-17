import type { ConnectorAccessFieldsProps } from "@/components/app/types/noraConnectors.types";
import { ConnectorAudienceField } from "./ConnectorAudienceField";

/** Where a connector is available: which workspaces, and whether every thread or only some bots' threads get it. */
export function ConnectorAccessFields({ value, choices, onChange }: ConnectorAccessFieldsProps) {
  return <div className="space-y-4">
    <ConnectorAudienceField legend="Workspaces" allLabel="All workspaces" onlyLabel="Only these workspaces" emptyText="Add a workspace first."
      choices={choices.workspaces} value={value.workspaces} onChange={(workspaces) => onChange({ ...value, workspaces })} />
    <ConnectorAudienceField legend="Threads" allLabel="Every thread" onlyLabel="Only these bots" emptyText="Create a bot first."
      choices={choices.bots} value={value.bots} onChange={(bots) => onChange({ ...value, bots })} />
    {value.bots.kind === "only" ? <p className="text-xs text-muted-foreground">Plain threads won't get this connector. Other bots can still ask a bot that has it.</p> : null}
  </div>;
}
