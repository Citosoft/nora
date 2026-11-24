import type { ConversationRun, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { TurnActivity } from "@shared/types/conversation/turnActivity.types";
import { TURN_WAITING_PHRASES } from "./turnWaitingPhrases";

/** A stable pick per gap: the same phrase while one step is pending, a new one once the turn moves on. */
function waitingPhrase(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TURN_WAITING_PHRASES[hash % TURN_WAITING_PHRASES.length] ?? TURN_WAITING_PHRASES[0];
}

/** Use normalized categories rather than guessing from provider tool names or message text. */
function toolActivity(item: ToolActivity): TurnActivity {
  switch (item.details?.category) {
    case "search": return { kind: "searching", label: "Searching…" };
    case "integration": return { kind: "connecting", label: "Using an integration…" };
    case "command": return { kind: "working", label: "Running a command…" };
    case "file": return { kind: "working", label: "Working with files…" };
    case "image": return { kind: "working", label: "Working with images…" };
    case "agent": return { kind: "working", label: "Delegating work…" };
    case "wait": return { kind: "working", label: "Waiting…" };
    case "other":
    case undefined: return { kind: "working", label: "Working…" };
  }
}

/**
 * What a turn is doing right now, given its latest timeline item, or null when idle or waiting on the user.
 */
export function turnActivity(run: ConversationRun, latest: TimelineItem | null): TurnActivity | null {
  switch (run.state) {
    case "starting": return { kind: "starting", label: "Starting…" };
    case "stopping": return { kind: "stopping", label: "Stopping…" };
    case "running": break;
    default: return null;
  }
  if (latest?.kind === "reasoning" && !latest.complete) return { kind: "thinking", label: "Thinking…" };
  if (latest?.kind === "message" && latest.role === "assistant" && !latest.complete && latest.text.trim()) return { kind: "composing", label: "Writing a reply…" };
  if (latest?.kind === "tool" && latest.state === "running") return toolActivity(latest);
  if (latest?.kind === "subagent" && latest.state === "running") return { kind: "working", label: "Agents are working…" };
  return { kind: "waiting", label: `${waitingPhrase(`${run.id}:${latest?.id ?? ""}`)}…` };
}
