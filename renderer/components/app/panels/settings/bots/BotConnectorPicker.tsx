import { galleryEntryForUrl } from "@shared/connectors/gallery";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { connectorAvailableTo } from "@shared/connectors/access";
import { McpServerLogo } from "../McpServerLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CONNECTOR_STATUS_BADGES } from "@/components/app/constants/connectorStatus";
import type { BotConnectorPickerProps } from "@/components/app/types/botEditor.types";

export function BotConnectorPicker({ connectorIds, connectors, error, disabled, workspaceId, botId, recommendations, onChange }: BotConnectorPickerProps) {
  const [query, setQuery] = useState("");
  const selected = new Set(connectorIds);
  const results = (connectors ?? []).filter((connector) => connector.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const notAdded = recommendations.filter((entry) => connectors && !connectors.some((connector) => galleryEntryForUrl(connector.url)?.id === entry.id));
  const missingIds = connectorIds.filter((id) => connectors && !connectors.some((connector) => connector.id === id));
  return <Popover onOpenChange={() => setQuery("")}>
    <PopoverTrigger asChild><Button type="button" variant="outline" className="shrink-0 gap-2" disabled={disabled} aria-label={`Choose bot connectors, ${connectorIds.length} selected`}>
      {connectorIds.length} selected<ChevronDown className="size-4" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="end" collisionPadding={12} className="z-[31000] flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-[min(23rem,calc(100vw-2rem))] flex-col gap-3 overflow-hidden">
      <div>
        <h3 className="text-sm font-medium">Choose connectors</h3>
        <p className="mt-1 text-xs text-muted-foreground">Workspace and connector availability still apply.</p>
      </div>
      <Input type="search" aria-label="Search connectors" placeholder="Search connectors…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{connectorIds.length ? `${connectorIds.length} selected` : "No connectors selected"}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={disabled || !connectorIds.length} onClick={() => onChange([])}>Clear selection</Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {connectors === null && !error && <p role="status" className="text-xs text-muted-foreground">Loading connectors…</p>}
      {connectors?.length === 0 && <p className="text-xs text-muted-foreground">Add connectors in Settings → MCP Servers.</p>}
      {!!connectors?.length && !results.length && <p className="text-xs text-muted-foreground">No matching connectors.</p>}
      {!!results.length && <ul className="min-h-0 space-y-1 overflow-y-auto" aria-label="Bot connectors">
        {results.map((connector) => {
          const allowed = !workspaceId || connectorAvailableTo(connector.access, { workspaceId, botId });
          return <li key={connector.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1.5 hover:bg-muted/50">
              <input type="checkbox" className="mt-0.5 accent-primary" disabled={disabled} checked={selected.has(connector.id)} onChange={(event) =>
                onChange(event.target.checked ? [...connectorIds, connector.id] : connectorIds.filter((id) => id !== connector.id))} />
              <McpServerLogo logo={connector.logo} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{connector.name}</span>
                <span className="block text-xs text-muted-foreground">{allowed ? CONNECTOR_STATUS_BADGES[connector.status].label : "Restricted by connector availability"}</span>
              </span>
            </label>
          </li>;
        })}
      </ul>}
      {notAdded.length > 0 && <p className="text-xs text-muted-foreground">Recommended by this template: {notAdded.map((entry) => entry.name).join(", ")}. Add these in Settings → MCP Servers.</p>}
      {missingIds.length > 0 && <div className="text-xs text-muted-foreground">
        <p>{missingIds.length} saved {missingIds.length === 1 ? "connector is" : "connectors are"} missing from this computer.</p>
        <Button type="button" variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs" disabled={disabled} onClick={() => onChange(connectorIds.filter((id) => !missingIds.includes(id)))}>Remove missing connectors</Button>
      </div>}
    </PopoverContent>
  </Popover>;
}
