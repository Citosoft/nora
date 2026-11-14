import { RefreshCw } from "lucide-react";
import { MEMORY_REVIEW_ACTIVITY_DAYS } from "@shared/bots/memoryReviewActivity";
import { describeReview, formatTokens, reviewSourceKind } from "@/components/app/logic/memoryReviewActivity";
import { AiProviderOptionLabel } from "@/components/app/panels/settings/AiProviderOptionLabel";
import { ProviderOptionLabel } from "@/components/app/panels/settings/ProviderOptionLabel";
import { Button } from "@/components/ui/button";
import type { MemoryReviewActivityPanelProps, MemoryReviewSourceLabelProps } from "@/components/app/types/modelPicker.types";

function SourceLabel({ record }: MemoryReviewSourceLabelProps) {
  const label = record.model ?? "Runtime default";
  const source = reviewSourceKind(record.provider);
  if (source.kind === "runtime") return <ProviderOptionLabel kind={source.provider} label={label} />;
  if (source.kind === "cloud") return <AiProviderOptionLabel provider={source.provider} label={label} />;
  return <span className="truncate">{record.provider} · {label}</span>;
}

/** What background reviews did and how many tokens they used, so a drain on a subscription is visible. */
export function MemoryReviewActivityPanel({ state: { activity, loading, error, refresh } }: MemoryReviewActivityPanelProps) {
  const totals = activity?.totals;
  return <section aria-labelledby="memory-review-activity" className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 id="memory-review-activity" className="text-sm font-medium">Review activity</h3>
        <p role="status" className="text-xs text-muted-foreground">
          {loading && !activity ? "Loading…" : totals ? [`Last ${MEMORY_REVIEW_ACTIVITY_DAYS} days: ${totals.reviews} ${totals.reviews === 1 ? "review" : "reviews"}`,
            `${formatTokens(totals.inputTokens)} tokens in`, `${formatTokens(totals.outputTokens)} out`,
            ...(totals.failed ? [`${totals.failed} failed`] : []), ...(totals.unmetered ? [`${totals.unmetered} without usage reported`] : [])].join(" · ") : null}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" disabled={loading} aria-label="Refresh review activity" tooltip="Refresh"
        onClick={refresh}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /></Button>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {activity && (activity.recent.length ? <ul aria-label="Recent memory reviews" className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60">
      {activity.recent.map((record) => <li key={record.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2 text-xs">
        <span className="min-w-0 truncate font-medium">{record.threadTitle || "Untitled thread"} <span className="font-normal text-muted-foreground">· {record.ownerName}</span></span>
        <time dateTime={record.at} className="text-muted-foreground">{new Date(record.at).toLocaleString()}</time>
        <span className="min-w-0 text-muted-foreground"><SourceLabel record={record} /></span>
        <span className="text-right tabular-nums text-muted-foreground">{record.usage ? `${formatTokens(record.usage.inputTokens)} in · ${formatTokens(record.usage.outputTokens)} out` : "Usage not reported"}</span>
        <span className={`col-span-2 min-w-0 truncate ${record.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{describeReview(record)}</span>
      </li>)}
    </ul> : <p className="text-xs text-muted-foreground">No reviews yet. Reviews run after a thread goes quiet, is settled or reaches 10 turns.</p>)}
  </section>;
}
