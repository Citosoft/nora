import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { NativeTurnActivity } from "@/components/app/types/nativeActivity.types";
import { TURN_WAITING_PHRASES } from "@/components/app/constants/turnWaitingPhrases";

/** A stable pick per gap: the same phrase while one step is pending, a new one once the turn moves on. */
function waitingPhrase(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TURN_WAITING_PHRASES[hash % TURN_WAITING_PHRASES.length];
}

/** Whether the turn's latest item already shows live progress on its own (a shimmering tool row or streaming reply). */
function showsOwnProgress(item: TimelineItem): boolean {
  switch (item.kind) {
    case "tool":
    case "subagent": return item.state === "running";
    case "message": return item.role === "assistant" && !item.complete && item.text.trim().length > 0;
    default: return false;
  }
}

/**
 * What a turn is doing right now, given its latest timeline item, or null when the turn is idle, waiting on
 * the user, or its latest row already shows progress.
 */
export function nativeTurnActivity(run: ConversationRun, latest: TimelineItem | null): NativeTurnActivity | null {
  switch (run.state) {
    case "starting": return { kind: "starting", label: "Starting…" };
    case "stopping": return { kind: "stopping", label: "Stopping…" };
    case "running": break;
    default: return null;
  }
  if (latest && showsOwnProgress(latest)) return null;
  if (latest?.kind === "reasoning" && !latest.complete) return { kind: "thinking", label: "Thinking…" };
  return { kind: "waiting", label: `${waitingPhrase(`${run.id}:${latest?.id ?? ""}`)}…` };
}
