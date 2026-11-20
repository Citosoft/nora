import { conversationsWithRequests, inboxTier, isSnoozed, projectInbox } from "@shared/inbox/projection";
import type { ConversationDetailResponse } from "@shared/types/remote-access/runtimeApi.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxCommand, InboxItem, InboxRequestSource } from "@shared/types/inbox/inbox.types";
import type { InboxEntryDescription, MobileInboxSection } from "@/types/inbox.types";
import type { ActionSheetOption } from "@/types/listUi.types";

/** Conversations whose headers an older computer's inbox needs, since it cannot build the inbox itself. */
export const legacyInboxConversations = conversationsWithRequests;

/**
 * For a computer without `inbox.read`: its waiting requests, built with the same projection the desktop uses. With no stored
 * marks and a baseline of now, only requests appear; updates need the computer's own inbox.
 */
export function legacyInbox(summaries: readonly ConversationSummary[], details: readonly ConversationDetailResponse[], now: string): InboxItem[] {
  const conversations = new Map(summaries.map(({ conversation }) => [conversation.id, conversation]));
  const requests: InboxRequestSource[] = details.flatMap(({ header }) => header.pendingRequests.map((request) => ({ conversation: header.conversation,
    parent: header.conversation.parentId ? conversations.get(header.conversation.parentId) ?? null : null, request })));
  return projectInbox({ summaries: [], requests, workflows: [], connectors: [], previews: new Map() }, { version: 1, baselineAt: now, marks: {} }, now).snapshot.items;
}

export function mobileInboxSections(items: readonly InboxItem[], now: string): MobileInboxSection[] {
  const awake = items.filter((item) => !isSnoozed(item, now));
  return [
    { id: "needs-you" as const, title: "Needs you", items: awake.filter((item) => inboxTier(item) === "needs-you") },
    { id: "updates" as const, title: "Updates", items: awake.filter((item) => inboxTier(item) === "update") },
    { id: "snoozed" as const, title: "Snoozed", items: items.filter((item) => isSnoozed(item, now)) }
  ].filter((section) => section.items.length);
}

/** Headline, detail and icon for a row that is not a request; mobile cannot open workflows or settings, so it says where to go. */
export function describeInboxEntry(item: Exclude<InboxItem, { kind: "request" }>): InboxEntryDescription {
  switch (item.kind) {
    case "outcome": {
      const failed = item.run.state === "failed", stopped = item.run.state === "interrupted";
      return { title: item.conversation.title, detail: item.preview ?? (failed ? item.run.failure?.message ?? "Failed" : stopped ? "Stopped" : "Finished"),
        icon: failed ? "alert-circle-outline" : "checkmark-circle-outline", tone: failed ? "danger" : stopped ? "warning" : "default" };
    }
    case "workflow": return item.status === "paused"
      ? { title: `${item.workflowName} paused`, detail: `${item.stopReason ?? item.objective} · Review it in Nora on your computer.`, icon: "git-network-outline", tone: "warning" }
      : { title: `${item.workflowName} finished`, detail: item.objective || null, icon: "git-network-outline", tone: "default" };
    case "connector": return { title: `${item.name} needs you to sign in`, detail: "Sign in again in Nora on your computer.", icon: "extension-puzzle-outline", tone: "warning" };
  }
}

/** Long-press actions: read or unread and done for updates, snooze or unsnooze for anything. */
export function inboxEntryOptions(item: InboxItem, now: Date, run: (command: InboxCommand) => void): ActionSheetOption[] {
  const ids = [item.id];
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  const update = inboxTier(item) === "update";
  return [
    ...(update ? [{ label: item.readAt ? "Mark as unread" : "Mark as read", icon: "mail-unread-outline" as const, onPress: () => run({ kind: item.readAt ? "mark-unread" : "mark-read", itemIds: ids }) },
      { label: "Done", icon: "checkmark-done-outline" as const, onPress: () => run({ kind: "mark-done", itemIds: ids }) }] : []),
    item.snoozedUntil ? { label: "Unsnooze", icon: "alarm-outline" as const, onPress: () => run({ kind: "unsnooze", itemIds: ids }) }
      : { label: "Snooze until tomorrow", icon: "alarm-outline" as const, onPress: () => run({ kind: "snooze", itemIds: ids, until: tomorrow.toISOString() }) }
  ];
}
