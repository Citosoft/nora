import type { UsageWindowRowProps } from "@/components/app/types/toolUsage.types";

export function UsageWindowRow({ window }: UsageWindowRowProps) {
  return (
    <>
      <div className="text-[11px] text-muted-foreground">{window.label}</div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/80" style={{ width: `${window.percentLeft}%` }} />
          </div>
          <div className="w-16 shrink-0 text-right text-xs tabular-nums text-foreground">{window.percentLeft}% left</div>
        </div>
        <div className="truncate text-xs text-muted-foreground" title={window.resetsLabel ?? "Reset time not reported"}>
          {window.resetsLabel ? `Resets ${window.resetsLabel}` : "Reset time not reported"}
        </div>
      </div>
    </>
  );
}
