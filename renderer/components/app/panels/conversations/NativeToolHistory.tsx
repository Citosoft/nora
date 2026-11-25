import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import { Check, ChevronRight, CircleHelp, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeToolHistory } from "@shared/conversations/toolHistory";
import { connectorForTool } from "@/components/app/logic/connectorForTool";
import type { McpServer } from "@shared/types/provider/mcp.types";
import type { NativeToolHistoryProps } from "@/components/app/types/nativeActivity.types";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import { NativeToolActivity } from "./NativeToolActivity";

const NO_SERVERS: readonly McpServer[] = [];

export function NativeToolHistory({ items, servers }: NativeToolHistoryProps) {
  const connectors = items.map((item) => connectorForTool(item, servers ?? NO_SERVERS));
  const logos = [...new Map(connectors.flatMap((connector) => connector ? [[connector.name, connector]] : [])).values()].slice(0, 3);
  const summary = summarizeToolHistory(items);
  const running = summary.state === "running";
  const Icon = running ? LoaderCircle : summary.state === "completed" ? Check : summary.state === "unconfirmed" ? CircleHelp : X;
  const status = toolStateLabel(summary.state);
  return <details className="group/tool-history text-sm text-muted-foreground" aria-label="Turn tool history">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <span className={cn("shrink-0", running && "motion-safe:animate-spin")}><Icon className="size-3.5" aria-hidden="true" /></span>
      {logos.map((connector) => <McpServerLogo key={connector.name} logo={connector.logo} size="small" />)}
      <span role="status" className={cn("min-w-0 truncate", running && "text-shimmer")}>{summary.label}<span className="sr-only"> · {status}</span></span>
      {running && <span className="shrink-0 text-xs">{summary.count} {summary.count === 1 ? "call" : "calls"}</span>}
      {summary.failedCount > 0 && <span className="shrink-0 text-xs text-destructive">{summary.failedCount} failed</span>}
      {!running && summary.state !== "failed" && <span className="shrink-0 text-xs">{status}</span>}
      <ChevronRight className="ml-auto size-3.5 shrink-0 transition-transform group-open/tool-history:rotate-90" aria-hidden="true" />
    </summary>
    <div className="mt-1 space-y-0.5" aria-label="Tool call history">{items.map((item, index) => <NativeToolActivity key={item.id} item={item} connector={connectors[index]} />)}</div>
  </details>;
}
