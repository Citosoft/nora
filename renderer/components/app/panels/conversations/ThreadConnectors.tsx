import { Plug, RefreshCcw } from "lucide-react";
import type { ThreadConnectorsProps } from "@/components/app/types/threadConnectors.types";
import { Button } from "@/components/ui/button";
import { ThreadConnectorsStatus } from "./ThreadConnectorsStatus";

/** MCP connectors enabled for the thread by its bound provider runtime, including servers configured for its checkout. */
export function ThreadConnectors({ connectors }: ThreadConnectorsProps) {
  const { summary, refresh } = connectors;
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><Plug className="size-3.5" aria-hidden="true" />Connectors
      {summary.status === "ready" && summary.servers.length > 0 && <span className="font-normal tabular-nums text-muted-foreground">{summary.servers.length}</span>}
      <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Refresh thread connectors" onClick={refresh} disabled={summary.status === "loading"}><RefreshCcw className="size-3" aria-hidden="true" /></Button>
    </div>
    <ThreadConnectorsStatus connectors={connectors} layout="preview" />
  </div>;
}
