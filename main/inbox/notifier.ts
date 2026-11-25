import { inboxCounts, inboxTarget, inboxTier, isSnoozed } from "@shared/inbox/projection";
import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxNotice, InboxNotifierDeps } from "@main/types/inbox/inbox.types";
import { watchInboxArrivals } from "./arrivals";

/** How a needs-you item reads as a desktop notification. */
export function describeInboxNotice(item: InboxItem): InboxNotice {
  const target = inboxTarget(item);
  switch (item.kind) {
    case "request": return { target, who: item.notice.who, title: item.notice.title, body: item.notice.body };
    case "workflow": return { target, who: item.workflowName, title: `${item.workflowName} needs you`, body: item.stopReason ?? item.objective };
    case "connector": return { target, who: item.name, title: `${item.name} needs you to sign in`, body: "Sign in again so your agents can use its tools." };
    case "outcome": return { target, who: item.conversation.bot?.name ?? item.conversation.title, title: item.conversation.title, body: item.preview ?? "" };
    case "alert": return { target, who: item.appName, title: item.title, body: item.detail ?? item.appName };
  }
}

/** Needs-you items that are not snoozed: what the badge counts and what is announced as it arrives. */
export const awakeNeedsYou = (snapshot: InboxSnapshot, now: string): InboxItem[] =>
  snapshot.items.filter((item) => inboxTier(item) === "needs-you" && !isSnoozed(item, now));

/**
 * Keeps the badge equal to what needs the user and notifies once for each needs-you item as it arrives or wakes from a
 * snooze. Items already waiting when Nora starts are counted but not announced again.
 */
export function startInboxNotifier(deps: InboxNotifierDeps): () => void {
  deps.setBadge(inboxCounts(deps.inbox.snapshot().items, deps.now()).needsYou);
  return watchInboxArrivals({ inbox: deps.inbox, select: (snapshot) => awakeNeedsYou(snapshot, deps.now()) }, (snapshot, arrived) => {
    deps.setBadge(inboxCounts(snapshot.items, deps.now()).needsYou);
    if (!arrived.length || !deps.shouldNotify()) return;
    for (const item of arrived) deps.notify(describeInboxNotice(item));
  });
}
