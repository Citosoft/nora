import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { McpServerLogo } from "../McpServerLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BotAccountConnectorFieldsProps } from "@/components/app/types/botEditor.types";

/**
 * Account connectors (for Claude, claude.ai connectors) are off for bots unless chosen here, since each one adds its whole
 * tool list to every turn. Hidden for runtimes without them unless an earlier choice is still saved.
 */
export function BotAccountConnectorFields({ selected, state, disabled, onChange }: BotAccountConnectorFieldsProps) {
  const [query, setQuery] = useState("");
  const connectors = state.status === "loaded" ? state.connectors : [];
  if (!selected.length && (state.status === "unsupported" || (state.status === "loaded" && !connectors.length && !state.notice))) return null;
  const chosen = new Set(selected);
  const results = connectors.filter((connector) => connector.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const missing = state.status === "loaded" ? selected.filter((name) => !connectors.some((connector) => connector.name === name)) : [];
  const toggle = (name: string, on: boolean) => onChange(on ? [...selected, name] : selected.filter((entry) => entry !== name));
  return <fieldset className="space-y-1.5 text-sm" disabled={disabled}>
    <legend className="mb-1.5 font-medium">Account connectors</legend>
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
        {state.status === "unsupported" ? "This bot's provider has no account connectors, so the saved choice is not used."
          : "Connectors from the provider's own account, such as claude.ai. The bot gets only the ones you choose."}</p>
      {state.status === "unsupported"
        ? <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={disabled} onClick={() => onChange([])}>Clear</Button>
        : <Popover onOpenChange={() => setQuery("")}>
          <PopoverTrigger asChild><Button type="button" variant="outline" className="shrink-0 gap-2" disabled={disabled} aria-label={`Choose account connectors, ${selected.length} selected`}>
            {selected.length ? `${selected.length} selected` : "None"}<ChevronDown className="size-4" aria-hidden="true" />
          </Button></PopoverTrigger>
          <PopoverContent align="end" collisionPadding={12} className="z-[31000] flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-[min(23rem,calc(100vw-2rem))] flex-col gap-3 overflow-hidden">
            <h3 className="text-sm font-medium">Choose account connectors</h3>
            <Input type="search" aria-label="Search account connectors" placeholder="Search account connectors…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selected.length ? `${selected.length} selected` : "None selected"}</span>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={disabled || !selected.length} onClick={() => onChange([])}>Clear selection</Button>
            </div>
            {state.status === "loading" && <p role="status" className="text-xs text-muted-foreground">Loading account connectors…</p>}
            {state.status === "unavailable" && <p role="alert" className="text-xs text-destructive">{state.message}</p>}
            {state.status === "loaded" && state.notice && <p className="text-xs text-muted-foreground">{state.notice}</p>}
            {state.status === "loaded" && !!connectors.length && !results.length && <p className="text-xs text-muted-foreground">No matching account connectors.</p>}
            {!!results.length && <ul className="min-h-0 space-y-1 overflow-y-auto" aria-label="Account connectors">
              {results.map((connector) => <li key={connector.name}>
                <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1.5 hover:bg-muted/50">
                  <input type="checkbox" className="mt-0.5 accent-primary" checked={chosen.has(connector.name)}
                    disabled={disabled || (!connector.connected && !chosen.has(connector.name))} onChange={(event) => toggle(connector.name, event.target.checked)} />
                  <McpServerLogo logo={connector.logo} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{connector.name}</span>
                    <span className="block text-xs text-muted-foreground">{connector.connected ? "Connected" : "Not connected. Connect it in Settings → MCP Servers."}</span>
                  </span>
                </label>
              </li>)}
            </ul>}
            {missing.length > 0 && <div className="text-xs text-muted-foreground">
              <p>{missing.length} saved {missing.length === 1 ? "connector is" : "connectors are"} not in this account: {missing.join(", ")}.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs" disabled={disabled} onClick={() => onChange(selected.filter((name) => !missing.includes(name)))}>Remove missing connectors</Button>
            </div>}
          </PopoverContent>
        </Popover>}
    </div>
  </fieldset>;
}
