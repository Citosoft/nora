import { Check, CircleAlert, Plus } from "lucide-react";
import { ImportReviewRow } from "./ImportReviewRow";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { AppImportConnectorState, ImportConnectorRowProps } from "@/components/app/types/appsView.types";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OUTCOME: Record<AppImportConnectorState, { label: string; className: string; Icon: typeof Check }> = {
  reused: { label: "Connected", className: "text-emerald-700 dark:text-emerald-300", Icon: Check },
  added: { label: "Added on install", className: "text-muted-foreground", Icon: Plus },
  setup: { label: "Needs setup", className: "text-amber-700 dark:text-amber-300", Icon: CircleAlert }
};

/**
 * One connector the app names and what installing does with it. A picker appears only when several of your connectors serve the
 * same server, since a connector to a different server could not stand in for it.
 */
export function ImportConnectorRow({ entry, disabled, onChoose }: ImportConnectorRowProps) {
  const { described, candidates, chosen, state } = entry;
  const outcome = OUTCOME[state];
  return <ImportReviewRow title={described.url || undefined} leading={<McpServerLogo logo={entry.logo} />} label={<span className="truncate text-sm">{described.name}</span>}>
    {candidates.length > 1
      ? <Select aria-label={`Connector for ${described.name}`} className="h-8 w-full text-xs" disabled={disabled} value={chosen?.id ?? ""} onChange={(event) => onChoose(event.target.value || null)}>
          <option value="">{state === "setup" ? "Choose a connector…" : "Add a new one"}</option>
          {candidates.map((connector) => <option key={connector.id} value={connector.id}>{connector.name}</option>)}
        </Select>
      : <p className={cn("flex items-center justify-end gap-1.5 whitespace-nowrap text-xs", outcome.className)}><outcome.Icon className="size-3.5" aria-hidden="true" />{outcome.label}</p>}
  </ImportReviewRow>;
}
