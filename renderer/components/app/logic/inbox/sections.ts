import { inboxCounts, inboxTier, isSnoozed } from "@shared/inbox/projection";
import type { InboxItem } from "@shared/types/inbox/inbox.types";
import type { InboxListFilter, InboxSection, InboxSnoozeChoice, InboxView, InboxViewCount } from "@/components/app/types/inbox.types";

export const INBOX_VIEW_LABELS: Readonly<Record<InboxView, string>> = Object.freeze({ all: "Inbox", "needs-you": "Needs you", updates: "Updates", snoozed: "Snoozed" });

/** Words matched against an item's title and detail, so search finds a bot, a thread, a workflow or a connector by name. */
export function inboxItemText(item: InboxItem): string {
  switch (item.kind) {
    case "request": return `${item.notice.title} ${item.notice.body} ${item.conversation.title}`;
    case "outcome": return `${item.conversation.bot?.name ?? ""} ${item.conversation.title} ${item.preview ?? ""}`;
    case "workflow": return `${item.workflowName} ${item.objective} ${item.stopReason ?? ""}`;
    case "connector": return item.name;
    case "alert": return `${item.appName} ${item.title} ${item.detail ?? ""}`;
  }
}

function matches(item: InboxItem, filter: InboxListFilter): boolean {
  if (filter.workspaceId && item.workspaceId && item.workspaceId !== filter.workspaceId) return false;
  const query = filter.query.trim().toLowerCase();
  return !query || inboxItemText(item).toLowerCase().includes(query);
}

/** The sections a view shows, in order; snoozed items only appear in the Snoozed view. */
export function buildInboxSections(items: readonly InboxItem[], filter: InboxListFilter, now: string): InboxSection[] {
  const visible = items.filter((item) => matches(item, filter));
  const awake = visible.filter((item) => !isSnoozed(item, now));
  const sections: InboxSection[] = [
    { id: "needs-you", title: "Needs you", items: awake.filter((item) => inboxTier(item) === "needs-you") },
    { id: "updates", title: "Updates", items: awake.filter((item) => inboxTier(item) === "update") },
    { id: "snoozed", title: "Snoozed", items: visible.filter((item) => isSnoozed(item, now)) }
  ];
  const shown: Record<InboxView, readonly InboxSection["id"][]> = { all: ["needs-you", "updates"], "needs-you": ["needs-you"], updates: ["updates"], snoozed: ["snoozed"] };
  return sections.filter((section) => shown[filter.view].includes(section.id));
}

export function inboxViewCounts(items: readonly InboxItem[], workspaceId: string | null, now: string): InboxViewCount[] {
  const scoped = items.filter((item) => !workspaceId || !item.workspaceId || item.workspaceId === workspaceId);
  const counts = inboxCounts(scoped, now);
  return [
    { view: "all", label: INBOX_VIEW_LABELS.all, count: counts.needsYou + counts.unread },
    { view: "needs-you", label: INBOX_VIEW_LABELS["needs-you"], count: counts.needsYou },
    { view: "updates", label: INBOX_VIEW_LABELS.updates, count: counts.unread },
    { view: "snoozed", label: INBOX_VIEW_LABELS.snoozed, count: scoped.filter((item) => isSnoozed(item, now)).length }
  ];
}

/** Unread updates in what a view shows, for "Mark all read". */
export function unreadUpdateIds(sections: readonly InboxSection[]): string[] {
  return sections.flatMap((section) => section.items).flatMap((item) => inboxTier(item) === "update" && !item.readAt ? [item.id] : []);
}

/** Later today (in three hours), this evening at 6pm when that is still ahead, tomorrow and next week at 9am. */
export function snoozeChoices(now: Date): InboxSnoozeChoice[] {
  const at = (days: number, hour: number): Date => { const next = new Date(now); next.setDate(next.getDate() + days); next.setHours(hour, 0, 0, 0); return next; };
  const evening = at(0, 18);
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  return [
    { label: "In 3 hours", until: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString() },
    ...(evening.getTime() - now.getTime() > 60 * 60 * 1000 ? [{ label: "This evening", until: evening.toISOString() }] : []),
    { label: "Tomorrow", until: at(1, 9).toISOString() },
    { label: "Next week", until: at(daysToMonday, 9).toISOString() }
  ];
}
