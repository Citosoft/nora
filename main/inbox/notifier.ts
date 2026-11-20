import { inboxCounts, inboxTarget, inboxTier, isSnoozed } from "@shared/inbox/projection";
import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxNotice, InboxNotifierDeps } from "@main/types/inbox/inbox.types";

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

const awakeNeedsYou = (snapshot: InboxSnapshot, now: string): Set<string> =>
  new Set(snapshot.items.filter((item) => inboxTier(item) === "needs-you" && !isSnoozed(item, now)).map((item) => item.id));

/**
 * Keeps the badge equal to what needs the user and notifies once for each needs-you item as it arrives or wakes from a
 * snooze. Items already waiting when Nora starts are counted but not announced again.
 */
export function startInboxNotifier(deps: InboxNotifierDeps): () => void {
  let seen = awakeNeedsYou(deps.inbox.snapshot(), deps.now());
  deps.setBadge(inboxCounts(deps.inbox.snapshot().items, deps.now()).needsYou);
  return deps.inbox.subscribe((snapshot) => {
    const now = deps.now();
    deps.setBadge(inboxCounts(snapshot.items, now).needsYou);
    const current = awakeNeedsYou(snapshot, now);
    const arrived = snapshot.items.filter((item) => current.has(item.id) && !seen.has(item.id));
    seen = current;
    if (!arrived.length || !deps.shouldNotify()) return;
    for (const item of arrived) deps.notify(describeInboxNotice(item));
  });
}
