import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { NativeRunHistory } from "@/components/app/types/nativeConversation.types";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";

/** Preserve turn creation order when late metadata or reviews update an earlier turn. */
export function mergeRunHistory(earlier: readonly ConversationRun[], later: readonly ConversationRun[]): ConversationRun[] {
  return [...new Map([...earlier, ...later].map((run) => [run.id, run])).values()];
}

/** Run and timeline positions are independent; page runs until every loaded turn is covered. */
export async function loadNativeRunHistory(client: ConversationClient, conversationId: string, items: readonly TimelineItem[], previous?: NativeRunHistory): Promise<NativeRunHistory> {
  let runs = previous?.runs ?? [];
  const covered = new Set(runs.map((run) => run.id));
  const required = new Set(items.map((item) => item.runId));
  let nextBefore = previous?.nextBefore;
  while ((!previous || nextBefore !== null) && (nextBefore === undefined || [...required].some((id) => !covered.has(id)))) {
    const page = await client.history({ conversationId, scope: "runs", limit: 100, ...(typeof nextBefore === "number" ? { before: nextBefore } : {}) });
    if (page.scope !== "runs") throw new Error("Incompatible turn history");
    runs = mergeRunHistory(page.runs, runs);
    for (const run of page.runs) covered.add(run.id);
    nextBefore = page.nextBefore;
    if (nextBefore === null) break;
  }
  return { runs, nextBefore: nextBefore ?? null };
}
