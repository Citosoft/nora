import { useMemo } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHoverPopover } from "@/components/app/hooks/useHoverPopover";
import { useToolUsage } from "@/components/app/hooks/useToolUsage";
import { describeUsageRings, hasUsageRings, selectUsageRings } from "@/components/app/logic/usageRings";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { RingGauge } from "@/components/app/shared/RingGauge";
import { UsageSummaryGrid } from "@/components/app/shared/UsageSummaryGrid";
import type { ProviderUsageWidgetProps } from "@/components/app/types/toolUsage.types";

const formatUpdatedAt = (iso: string): string => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Weekly and ~5-hour usage for the composer's selected provider, with details on hover. */
export function ProviderUsageWidget({ provider }: ProviderUsageWidgetProps) {
  const { entry, load } = useToolUsage(provider?.kind ?? null);
  const hover = useHoverPopover({ onOpen: () => load() });
  const info = entry?.info ?? null;
  const rings = useMemo(() => selectUsageRings(info), [info]);
  // Providers without usage reporting (most ACP agents) or without rolling windows show nothing.
  if (!provider || !entry || !info || (info.status === "available" && !hasUsageRings(rings))) return null;
  const label = `${provider.label} usage`;
  return <Popover open={hover.open} onOpenChange={hover.onOpenChange}>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="size-8 shrink-0 p-0" aria-label={`${label}: ${describeUsageRings(rings)}`} {...hover.triggerProps}>
        <RingGauge rings={[rings.weekly, rings.session]} className={info.status === "available" ? undefined : "opacity-60"} />
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" align="end" aria-label={label} className="w-72 space-y-3" {...hover.contentProps}>
      <div className="flex items-center gap-2">
        <AgentToolIcon toolId={provider.kind} label="" className="size-5 shrink-0" imageClassName="size-4" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{label}</p>
        <Button type="button" variant="ghost" size="sm" className="size-7 shrink-0 p-0" disabled={entry.loading} aria-label={`Refresh ${label}`} onClick={() => load(true)}>
          {entry.loading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-3.5" aria-hidden="true" />}
        </Button>
      </div>
      <UsageSummaryGrid info={info} />
      {info.notice && <p role="status" className="text-xs text-muted-foreground">{info.notice}</p>}
      {entry.error && <p role="alert" className="text-xs text-destructive">{entry.error}</p>}
      <p className="text-[11px] text-muted-foreground">Updated {formatUpdatedAt(info.fetchedAt)}</p>
    </PopoverContent>
  </Popover>;
}
