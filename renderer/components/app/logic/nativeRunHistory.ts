import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { NativeRunHistory } from "@/components/app/types/nativeConversation.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

/** Run and timeline positions are independent; page runs until every loaded turn is covered. */
export async function loadNativeRunHistory(client: ConversationClient, conversationId: string, items: readonly TimelineItem[], previous?: NativeRunHistory): Promise<NativeRunHistory> {
  const runs = new Map(previous?.runs.map((run) => [run.id, run]));
  const required = new Set(items.map((item) => item.runId));
  let nextBefore = previous?.nextBefore;
  while ((!previous || nextBefore !== null) && (nextBefore === undefined || [...required].some((id) => !runs.has(id)))) {
    const page = await client.history({ conversationId, scope: "runs", limit: 100, ...(typeof nextBefore === "number" ? { before: nextBefore } : {}) });
    if (page.scope !== "runs") throw new Error("Incompatible turn history");
    for (const run of page.runs) if (!runs.has(run.id)) runs.set(run.id, run);
    nextBefore = page.nextBefore;
    if (nextBefore === null) break;
  }
  return { runs: [...runs.values()], nextBefore: nextBefore ?? null };
}
