import { useBotConnectorIds } from "@/components/app/hooks/useBotConnectorIds";
import { useState } from "react";
import { Plug, Plus, RefreshCcw } from "lucide-react";
import { connectorSelectedFor } from "@shared/connectors/access";
import type { Connector } from "@shared/types/connectors/connectors.types";
import { ConnectorGalleryDialog } from "@/components/app/dialogs/ConnectorGalleryDialog";
import { ConnectorAccessDialog } from "@/components/app/dialogs/ConnectorAccessDialog";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { composerConnectorBadge } from "@/components/app/logic/composerConnectors";
import { AppMark } from "@/components/app/shared/AppMark";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { NativeComposerConnectorsProps } from "@/components/app/types/noraConnectors.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NoraConnectorListItem } from "./NoraConnectorListItem";
import { ThreadConnectorsStatus } from "./ThreadConnectorsStatus";

const SECTION_HEADING = "flex items-center gap-1.5 text-xs font-medium text-muted-foreground";

/**
 * The composer's connector control: everything this thread can use (Nora's connectors available to it and the ones its
 * provider runtime enables), Nora connectors kept from it so their availability can be widened, and adding a new one.
 */
export function NativeComposerConnectors({ disabled, subject, accessChoices, providerConnectors }: NativeComposerConnectorsProps) {
  const controls = useNoraConnectors();
  const connectorIds = useBotConnectorIds(subject);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingAccess, setEditingAccess] = useState<Connector | null>(null);
  const connectors = controls.connectors ?? [];
  const here = connectors.filter((connector) => connectorSelectedFor(connector, subject, connectorIds));
  const elsewhere = connectors.filter((connector) => !here.includes(connector));
  const badge = composerConnectorBadge(here, providerConnectors?.summary ?? null);
  // Dialogs open after the popover closes, so focus moves into the dialog instead of fighting the popover.
  const startAdding = () => { setOpen(false); setAdding(true); };
  const editAccess = (connector: Connector) => { setOpen(false); setEditingAccess(connector); };
  const item = (connector: Connector) => <NoraConnectorListItem key={connector.id} connector={connector} controls={controls} manage onEditAccess={editAccess} />;
  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" disabled={disabled}>
        {badge.logos.length ? <span className="flex shrink-0 -space-x-1" aria-hidden="true">
          {badge.logos.map((entry) => <span key={entry.key} className="rounded-[4px] ring-2 ring-card"><McpServerLogo logo={entry.logo} size="small" /></span>)}
        </span> : <Plug className="size-3.5" aria-hidden="true" />}Connectors
        {badge.count ? <span className="tabular-nums">{badge.count}</span> : null}
        {badge.needsSignIn ? <><span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" /><span className="sr-only">(sign-in required)</span></> : null}
      </Button></PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Connectors</p>
          <p className="text-xs text-muted-foreground">MCP servers this thread can use from its next turn.</p>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto text-xs">
          {controls.loadError ? <p role="alert" className="text-destructive">{controls.loadError}</p>
            : controls.connectors === null ? <p role="status" className="text-muted-foreground">Loading Nora connectors…</p>
            : here.length ? <section className="space-y-1.5" aria-label="Added in Nora">
              <p className={SECTION_HEADING}><AppMark className="size-3.5" />Added in Nora</p>
              <ul className="space-y-1.5" aria-live="polite">{here.map(item)}</ul>
            </section> : null}
          {providerConnectors ? <section className="space-y-1.5" aria-label={`From ${providerConnectors.source.label}`}>
            <div className={SECTION_HEADING}><Plug className="size-3.5" aria-hidden="true" />From {providerConnectors.source.label}
              <Button type="button" variant="ghost" size="icon" className="ml-auto size-6" aria-label={`Refresh ${providerConnectors.source.label} connectors`}
                onClick={providerConnectors.refresh} disabled={providerConnectors.summary.status === "loading"}><RefreshCcw className="size-3" aria-hidden="true" /></Button>
            </div>
            <ThreadConnectorsStatus connectors={providerConnectors} layout="full" />
          </section> : !here.length && controls.connectors !== null
            ? <p className="text-muted-foreground">No connectors are available in this thread yet. Add a server URL to give it that server's tools.</p> : null}
          {elsewhere.length ? <section className="space-y-1.5 border-t border-border/50 pt-3" aria-label="Not available in this thread">
            <p className={SECTION_HEADING}>Not available in this thread</p>
            {subject.botId && <p className="text-xs text-muted-foreground">Check this bot’s connector selection in its editor as well as connector availability.</p>}
            <ul className="space-y-1.5">{elsewhere.map(item)}</ul>
          </section> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={startAdding}><Plus className="size-3.5" aria-hidden="true" />Add connector</Button>
      </PopoverContent>
    </Popover>
    <ConnectorGalleryDialog open={adding} onOpenChange={setAdding} onCreate={controls.create} accessChoices={accessChoices} addedUrls={connectors.map((entry) => entry.url)} />
    <ConnectorAccessDialog connector={editingAccess} accessChoices={accessChoices} onClose={() => setEditingAccess(null)} onSave={controls.setAccess} />
  </>;
}
