import { useState } from "react";
import { Check, KeyRound, Plus } from "lucide-react";
import { ConnectorGalleryDialog } from "@/components/app/dialogs/ConnectorGalleryDialog";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { AppConnectorPickerProps } from "@/components/app/types/appsView.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Which of the workspace's connectors the builder may use, as toggle chips, with the gallery one click away. */
export function AppConnectorPicker({ draft }: AppConnectorPickerProps) {
  const [adding, setAdding] = useState(false);
  const { available, selectedConnectorIds, connectors } = draft;
  return <div className="space-y-2">
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-xs font-medium text-muted-foreground">Connectors the app can use</p>
      {available.length > 0 && <p className="text-xs text-muted-foreground">{selectedConnectorIds.size} of {available.length} selected</p>}
    </div>
    <ul className="flex flex-wrap gap-2" aria-label="Connectors">
      {available.map((connector) => {
        const selected = selectedConnectorIds.has(connector.id);
        const needsSignIn = connector.status === "needs-auth";
        return <li key={connector.id} className="flex items-center">
          <button type="button" aria-pressed={selected} onClick={() => draft.toggleConnector(connector.id)}
            className={cn("flex h-8 items-center gap-2 rounded-full border pl-1.5 pr-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/70 bg-card text-muted-foreground hover:border-border")}>
            <McpServerLogo logo={connector.logo} size="small" />
            <span className="max-w-[12rem] truncate">{connector.name}</span>
            {selected ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
            {needsSignIn && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Sign-in required" />}
          </button>
          {needsSignIn && <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" disabled={!!connectors.pending(connector.id)} onClick={() => connectors.signIn(connector.id)}>
            <KeyRound className="size-3" aria-hidden="true" />{connectors.pending(connector.id) === "sign-in" ? "Signing in…" : "Sign in"}</Button>}
        </li>;
      })}
      <li><Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-sm" onClick={() => setAdding(true)}>
        <Plus className="size-3.5" aria-hidden="true" />{available.length ? "Add" : "Add a connector"}</Button></li>
    </ul>
    {!available.length && connectors.connectors !== null && <p className="text-xs text-muted-foreground">Nothing is connected in this workspace yet. Add Gmail, Notion, Linear, HubSpot or any other MCP server and the app can build on it.</p>}
    {connectors.loadError && <p role="alert" className="text-xs text-destructive">{connectors.loadError}</p>}
    <ConnectorGalleryDialog open={adding} onOpenChange={setAdding} onCreate={connectors.create} accessChoices={draft.accessChoices} addedUrls={(connectors.connectors ?? []).map((entry) => entry.url)} />
  </div>;
}
