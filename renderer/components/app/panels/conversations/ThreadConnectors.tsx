import { LoaderCircle, Plug, RefreshCcw } from "lucide-react";
import type { ThreadConnectorsProps } from "@/components/app/types/threadConnectors.types";
import { Button } from "@/components/ui/button";
import { ThreadConnectorList } from "./ThreadConnectorList";

/** MCP connectors enabled for the thread by its bound provider runtime, including servers configured for its checkout. */
export function ThreadConnectors({ connectors }: ThreadConnectorsProps) {
  const { source, summary, logins, refresh } = connectors;
  const providerLabel = source.label;
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><Plug className="size-3.5" aria-hidden="true" />Connectors
      {summary.status === "ready" && summary.servers.length > 0 && <span className="font-normal tabular-nums text-muted-foreground">{summary.servers.length}</span>}
      <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Refresh thread connectors" onClick={refresh} disabled={summary.status === "loading"}><RefreshCcw className="size-3" aria-hidden="true" /></Button>
    </div>
    <div aria-live="polite">
      {summary.status === "loading" ? <p className="flex items-center gap-1.5 text-muted-foreground"><LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Checking {providerLabel}…</p>
        : summary.status === "unavailable" ? <p className="text-muted-foreground">{summary.message}</p>
        : summary.servers.length ? <ThreadConnectorList servers={summary.servers} source={source} logins={logins} />
        : <p className="text-muted-foreground">No connectors enabled for {providerLabel}.</p>}
      {summary.status === "ready" && summary.notice && <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{summary.notice}</p>}
    </div>
  </div>;
}
