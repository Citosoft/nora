import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ChatWorkThread, ChatEntry } from "@/components/app/types/chatPanels.types";

/** Consecutive messages from one author closer together than this read as one burst. */
const BURST_MS = 5 * 60_000;

function authorKey(item: Extract<TimelineItem, { kind: "message" }>): string {
  return item.role === "user" ? "user" : `bot:${item.author?.botId ?? ""}`;
}

/**
 * A chat shows only what was said: user messages, bot replies and short notices (who is waiting, who could not reply).
 * The work behind each reply lives in its work thread, so tool activity, reasoning and plans never appear here.
 */
export function buildChatTimeline(items: readonly TimelineItem[], threads: readonly ChatWorkThread[] = []): ChatEntry[] {
  const timeline = [
    ...items.map((item) => ({ kind: "item" as const, item, createdAt: item.createdAt })),
    ...threads.filter((thread) => !thread.branch).map((thread) => ({ kind: "started" as const, thread, createdAt: thread.createdAt }))
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const entries: ChatEntry[] = [];
  let previous: { key: string; at: number } | null = null;
  for (const event of timeline) {
    if (event.kind === "started") {
      const { thread } = event;
      entries.push({ kind: "notice", id: `thread-created:${thread.id}`, workThreadId: thread.id,
        text: `${thread.author?.name ?? "A worker"} started “${thread.title}”` });
      previous = null;
      continue;
    }
    const { item } = event;
    if (item.kind === "milestone") { entries.push({ kind: "notice", id: item.id, text: item.text }); previous = null; continue; }
    if (item.kind !== "message" || !item.text.trim()) continue;
    const key = authorKey(item);
    const at = Date.parse(item.createdAt);
    entries.push({ kind: "message", id: item.id, from: item.role === "user" ? "user" : "bot", author: item.author ?? null, text: item.text,
      createdAt: item.createdAt, complete: item.complete, workThreadId: item.workThreadId ?? null,
      continued: !!previous && previous.key === key && at - previous.at < BURST_MS });
    previous = { key, at };
  }
  return entries;
}

/** A short clock time for a message, in the viewer's locale. */
export function chatTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
