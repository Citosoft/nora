import { LoaderCircle, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { McpAppEntryProps } from "@/components/app/types/mcpApp.types";
import { useMcpAppFrame } from "@/components/app/hooks/useMcpAppFrame";
import { McpAppFrame } from "./McpAppFrame";

/** An MCP tool's interactive widget, shown in the thread under the call that produced it. */
export function McpAppEntry({ call, host }: McpAppEntryProps) {
  const { state, retry } = useMcpAppFrame(host, call.tool.id);
  const title = `${call.app.tool} from ${call.app.server}`;
  return <section className="min-w-0 space-y-2" aria-label={title}>
    <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <Plug className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{call.app.tool}</span>
      <span className="shrink-0 text-xs text-muted-foreground/80">{call.app.server}</span>
    </p>
    {state.status === "loading" && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
      <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />Loading widget…</p>}
    {state.status === "unavailable" && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1">{state.message}</span>
      <Button type="button" variant="ghost" size="sm" onClick={retry}>Try again</Button>
    </div>}
    {state.status === "ready" && <McpAppFrame call={call} frame={state.frame} host={host} title={title} />}
  </section>;
}
