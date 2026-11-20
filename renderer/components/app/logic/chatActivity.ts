import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ChatWorkThread } from "@/components/app/types/chatPanels.types";
import type { ChatActivityEvent } from "@/components/app/types/chatActivity.types";

const preview = (text: string): string => {
  const line = text.trim().replace(/\s+/g, " ");
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
};

/** Chat notices and saved thread lifecycle changes; messages stay in the transcript. */
export function buildChatActivity(items: readonly TimelineItem[], threads: readonly ChatWorkThread[]): ChatActivityEvent[] {
  const events: ChatActivityEvent[] = [];
  for (const item of items) {
    if (item.kind === "milestone") {
      if (item.text.trim()) events.push({ id: `notice:${item.id}`, kind: "notice", title: item.text.trim(), createdAt: item.createdAt, threadId: null });
    }
  }
  for (const thread of threads) {
    events.push({ id: `started:${thread.id}`, kind: "started", title: `Thread started: ${thread.title}`, createdAt: thread.createdAt, threadId: thread.id });
    const run = thread.latestRun;
    if (!run) continue;
    const lifecycle = { id: `run:${thread.id}:${run.id}:${run.state}`, createdAt: run.updatedAt, threadId: thread.id };
    switch (run.state) {
      case "completed": events.push({ ...lifecycle, kind: "completed", title: `Completed: ${thread.title}` }); break;
      case "failed": events.push({ ...lifecycle, kind: "failed", title: `Failed: ${thread.title}`, ...(run.failure ? { detail: preview(run.failure.message) } : {}) }); break;
      case "interrupted": events.push({ ...lifecycle, kind: "interrupted", title: `Stopped: ${thread.title}` }); break;
      case "awaiting-approval": events.push({ ...lifecycle, kind: "waiting", title: `Approval needed: ${thread.title}` }); break;
      case "awaiting-input": events.push({ ...lifecycle, kind: "waiting", title: `Input needed: ${thread.title}` }); break;
      case "recovering": events.push({ ...lifecycle, kind: "waiting", title: `Outcome unconfirmed: ${thread.title}` }); break;
      case "queued": case "starting": case "running": case "stopping": break;
    }
  }
  return [...new Map(events.map((event) => [event.id, event])).values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
