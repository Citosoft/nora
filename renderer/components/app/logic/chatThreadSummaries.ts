import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ChatThreadTurnOutcome, ChatThreadTurnSummary } from "@/components/app/types/chatThreadDetail.types";

const REQUEST_LIMIT = 280;
const FINISHED: ReadonlySet<ChatThreadTurnOutcome["kind"]> = new Set(["done", "stopped", "failed"]);

/** Text on one line, cut at `max` characters with an ellipsis. */
export function clipSummaryText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

function outcomeOf(run: ConversationRun): ChatThreadTurnOutcome {
  switch (run.state) {
    case "queued": return { kind: "queued", label: "Queued" };
    case "starting": case "running": case "recovering": return { kind: "working", label: "Working" };
    case "stopping": return { kind: "working", label: "Stopping" };
    case "awaiting-approval": case "awaiting-input": return { kind: "waiting", label: "Waiting for you" };
    case "completed": return { kind: "done", label: "Done" };
    case "interrupted": return { kind: "stopped", label: "Stopped" };
    case "failed": return { kind: "failed", label: "Failed", detail: run.failure?.message ?? null };
  }
}

/**
 * Each turn of a work thread, oldest first: who asked for it and what, how it went, how many tools it ran, the files it changed
 * and its last reply. Later copies of a run (live state) replace earlier ones (saved history).
 */
export function buildChatThreadSummaries(runs: readonly ConversationRun[], items: readonly TimelineItem[]): ChatThreadTurnSummary[] {
  const latest = new Map<string, ConversationRun>();
  for (const run of runs) latest.set(run.id, run);
  const byRun = new Map<string, TimelineItem[]>();
  for (const item of items) byRun.set(item.runId, [...byRun.get(item.runId) ?? [], item]);
  return [...latest.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((run) => {
    const own = byRun.get(run.id) ?? [];
    const outcome = outcomeOf(run);
    const tools = own.filter((item) => item.kind === "tool");
    const reply = own.filter((item) => item.kind === "message" && item.role === "assistant" && !!item.text.trim()).at(-1);
    const files = new Set(own.flatMap((item) => item.kind === "changes" && item.attribution === "turn" ? item.paths : []));
    return {
      runId: run.id,
      at: run.startedAt ?? run.createdAt,
      request: run.chatText ? { from: "you", text: clipSummaryText(run.chatText, REQUEST_LIMIT) } : { from: "chat", text: clipSummaryText(run.instruction, REQUEST_LIMIT) },
      outcome,
      endedAt: FINISHED.has(outcome.kind) ? run.updatedAt : null,
      reply: reply?.kind === "message" ? { text: reply.text.trim(), at: reply.createdAt } : null,
      tools: tools.length,
      failedTools: tools.filter((item) => item.kind === "tool" && item.state === "failed").length,
      files: [...files]
    };
  });
}
