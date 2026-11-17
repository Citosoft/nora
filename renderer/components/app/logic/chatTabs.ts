import type { ChatBranchDraft, ChatWorkThread } from "@/components/app/types/chatPanels.types";

/** The chat itself; every other tab is a work thread id or a draft branch's key. */
export const CHAT_TAB = "chat";

/**
 * The work threads shown as tabs beside the chat, oldest first so new ones open on the right: every unsettled one,
 * plus a settled one while it is selected (so a tab that settles while open does not vanish under you).
 */
export function chatTabThreads(threads: readonly ChatWorkThread[], selected: string): ChatWorkThread[] {
  return threads.filter((thread) => !thread.settled || thread.id === selected).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Falls back to the chat when the selected work thread or draft branch is no longer behind it. */
export function resolveChatTab(threads: readonly ChatWorkThread[], drafts: readonly ChatBranchDraft[], selected: string): string {
  return selected === CHAT_TAB || threads.some((thread) => thread.id === selected) || drafts.some((draft) => draft.key === selected) ? selected : CHAT_TAB;
}

/** Drafts whose branch thread is now listed, so their tab can hand over to the thread's own. */
export function startedDrafts(drafts: readonly ChatBranchDraft[], threads: readonly ChatWorkThread[]): ChatBranchDraft[] {
  return drafts.filter((draft) => !!draft.threadId && threads.some((thread) => thread.id === draft.threadId));
}
