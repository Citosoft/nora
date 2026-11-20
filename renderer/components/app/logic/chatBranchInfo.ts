import type { ChatBranchTarget, ChatWorkThread } from "@/components/app/types/chatPanels.types";
import type { ChatThreadStatus } from "@/components/app/types/chatThreadDetail.types";

/** A branch or task tab's state in a few words. */
export function chatBranchStatus(target: ChatBranchTarget): string {
  if (target.kind === "draft") return target.draft.threadId ? "Starting…" : "Not started";
  const { thread } = target;
  return thread.settled ? "Settled" : thread.waiting ? "Waiting for you" : thread.working ? "Working" : "Ready";
}

/** A date and time short enough for a side panel, in the viewer's locale. */
export function formatChatMoment(at: string): string {
  return new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** A work thread's state for the sidebar's thread detail. */
export function chatThreadStatus(thread: ChatWorkThread): ChatThreadStatus {
  if (thread.settled) return { label: "Settled", tone: "settled" };
  if (thread.waiting) return { label: "Needs you", tone: "waiting" };
  return thread.working ? { label: "Working", tone: "working" } : { label: "Ready", tone: "ready" };
}
