import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ThreadChangeSummary } from "@/components/app/types/threadInsights.types";
import { patchLineCounts } from "@shared/conversations/diff";

export function summarizeThreadChanges(items: readonly TimelineItem[], hasOlderHistory: boolean): ThreadChangeSummary {
  const reviews = new Map<string, Extract<TimelineItem, { kind: "review" }>>();
  for (const item of items) if (item.kind === "review") reviews.set(item.runId, item);
  if (!reviews.size) return { status: "pending" };
  const files = new Set<string>();
  let additions = 0;
  let deletions = 0;
  let turnReviews = 0;
  let partial = hasOlderHistory;
  for (const { result } of reviews.values()) {
    if (result.status !== "ready" || result.scope !== "turn") { partial = true; continue; }
    turnReviews++;
    for (const change of result.changes) {
      files.add(change.path);
      if (!change.patch) { partial = true; continue; }
      const counts = patchLineCounts(change.patch);
      if (!counts) { partial = true; continue; }
      additions += counts.additions;
      deletions += counts.deletions;
    }
  }
  if (turnReviews) return { status: "ready", scope: "turn", files: files.size, additions, deletions, reviews: turnReviews, partial };
  // Workspace snapshots can include unrelated edits; keep them separate from turn evidence.
  const latest = [...reviews.values()].at(-1)?.result;
  if (latest?.status === "ready" && latest.scope === "workspace") return {
    status: "ready", scope: "workspace", files: new Set(latest.paths).size, additions: null, deletions: null, reviews: 0, partial: true
  };
  return { status: "unavailable" };
}
