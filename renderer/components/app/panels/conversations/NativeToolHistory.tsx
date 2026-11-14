import { Check, ChevronRight, CircleHelp, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeNativeToolHistory } from "@/components/app/logic/nativeToolHistory";
import type { NativeToolHistoryProps } from "@/components/app/types/nativeActivity.types";
import { toolStateLabel } from "@/components/app/logic/toolStateLabel";
import { NativeToolActivity } from "./NativeToolActivity";

export function NativeToolHistory({ items }: NativeToolHistoryProps) {
  const summary = summarizeNativeToolHistory(items);
  const running = summary.state === "running";
  const Icon = running ? LoaderCircle : summary.state === "completed" ? Check : summary.state === "unconfirmed" ? CircleHelp : X;
  const status = toolStateLabel(summary.state);
  return <details className="group/tool-history text-sm text-muted-foreground" aria-label="Turn tool history">
    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <span className={cn("shrink-0", running && "motion-safe:animate-spin")}><Icon className="size-3.5" aria-hidden="true" /></span>
      <span role="status" className={cn("min-w-0 truncate", running && "text-shimmer")}>{summary.label}<span className="sr-only"> · {status}</span></span>
      {running && <span className="shrink-0 text-xs">{summary.count} {summary.count === 1 ? "call" : "calls"}</span>}
      {summary.failedCount > 0 && <span className="shrink-0 text-xs text-destructive">{summary.failedCount} failed</span>}
      {!running && summary.state !== "failed" && <span className="shrink-0 text-xs">{status}</span>}
      <ChevronRight className="ml-auto size-3.5 shrink-0 transition-transform group-open/tool-history:rotate-90" aria-hidden="true" />
    </summary>
    <div className="mt-1 space-y-0.5" aria-label="Tool call history">{items.map((item) => <NativeToolActivity key={item.id} item={item} />)}</div>
  </details>;
}
