import { Fragment } from "react";
import { LoaderCircle, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHoverPopover } from "@/components/app/hooks/useHoverPopover";
import { contextGauge, describeContextUsage, formatTokenCount } from "@/components/app/logic/contextUsage";
import { RingGauge } from "@/components/app/shared/RingGauge";
import type { ContextUsageWidgetProps } from "@/components/app/types/contextUsage.types";

const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** How full the thread's native context window is, with a breakdown and compaction on hover. */
export function ContextUsageWidget({ context, compaction }: ContextUsageWidgetProps) {
  const hover = useHoverPopover();
  const gauge = context ? contextGauge(context) : null;
  const summary = describeContextUsage(context);
  const rows = context && gauge ? [
    { label: "Used", value: `${formatTokenCount(context.usedTokens)} tokens` },
    { label: "Remaining", value: `${formatTokenCount(gauge.remainingTokens)} tokens` },
    { label: "Window", value: `${formatTokenCount(context.windowTokens)} tokens` },
    { label: "Prompt", value: `${formatTokenCount(context.inputTokens)} (${formatTokenCount(context.cachedInputTokens)} cached)` },
    { label: "Last reply", value: `${formatTokenCount(context.outputTokens)} tokens` }
  ] : [];
  return <Popover open={hover.open} onOpenChange={hover.onOpenChange}>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="size-8 shrink-0 p-0" aria-label={`Context window: ${summary}`} {...hover.triggerProps}>
        <RingGauge rings={[gauge]} />
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" align="end" aria-label="Context window" className="w-72 space-y-3" {...hover.contentProps}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Context window</p>
        {gauge && <p className="text-sm tabular-nums text-muted-foreground">{gauge.percentUsed}%</p>}
      </div>
      {context && gauge ? <>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${gauge.tone === "critical" ? "bg-destructive" : gauge.tone === "warning" ? "bg-amber-500" : "bg-primary/80"}`} style={{ width: `${gauge.percentUsed}%` }} />
        </div>
        <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
          {rows.map((row) => <Fragment key={row.label}>
            <div className="text-[11px] text-muted-foreground">{row.label}</div>
            <div className="min-w-0 truncate text-right tabular-nums text-foreground">{row.value}</div>
          </Fragment>)}
        </div>
        <p className="text-[11px] text-muted-foreground">Updated {formatTime(context.updatedAt)}</p>
      </> : <p role="status" className="text-xs text-muted-foreground">{summary}.</p>}
      {compaction && <div className="space-y-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">Compacting summarizes earlier conversation so the agent keeps working with more room.</p>
        <Button type="button" size="sm" variant="outline" className="w-full justify-center" disabled={compaction.state !== "available"} onClick={compaction.onCompact}>
          {compaction.state === "compacting" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Shrink className="size-3.5" aria-hidden="true" />}
          {compaction.state === "compacting" ? "Compacting context…" : "Compact context"}
        </Button>
        {compaction.state === "blocked" && <p className="text-[11px] text-muted-foreground">Available once the current turn finishes.</p>}
      </div>}
    </PopoverContent>
  </Popover>;
}
