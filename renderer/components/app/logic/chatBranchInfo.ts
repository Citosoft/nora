import type { ChatBranchTarget } from "@/components/app/types/chatPanels.types";

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
