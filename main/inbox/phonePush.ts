import { inboxTarget, inboxTier, isSnoozed } from "@shared/inbox/projection";
import { clampPushText, PUSH_LIMITS } from "@shared/remote-access/push";
import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { PushNotification, PushTarget } from "@shared/types/remote-access/push.types";
import type { PhonePushNotifierDeps } from "@main/types/inbox/phonePush.types";
import { watchInboxArrivals } from "./arrivals";
import { describeInboxNotice } from "./notifier";

/** Long enough to gather items that land together (a run finishing with a follow-up request), short enough to feel live. */
export const PHONE_PUSH_BATCH_DELAY_MS = 1_500;
const MAX_NOTICE_ID_LENGTH = 300;

/** What reaches the phone: everything that needs the user, plus threads that finished. Snoozed items wait. */
export const phonePushItems = (snapshot: InboxSnapshot, now: string): InboxItem[] =>
  snapshot.items.filter((item) => !isSnoozed(item, now) && (item.kind === "outcome" || inboxTier(item) === "needs-you"));

/** The phone can open threads; every other target lands on the runtime's inbox. */
function pushTarget(item: InboxItem): PushTarget {
  const target = inboxTarget(item);
  return target.kind === "thread" ? { kind: "thread", conversationId: target.conversationId } : { kind: "inbox" };
}

/** How an inbox item reads as a phone notification: the desktop notice, clamped, naming who unless the title already does. */
export function phonePushNotification(item: InboxItem): PushNotification {
  const kind = item.kind === "outcome" ? "finished" : "needs-you";
  const notice = describeInboxNotice(item);
  const who = notice.who.trim();
  const body = notice.body.trim() || (kind === "finished" ? "Finished" : "Needs you");
  return {
    kind,
    id: item.id.slice(0, MAX_NOTICE_ID_LENGTH),
    title: clampPushText(notice.title, PUSH_LIMITS.titleMaxLength) || "Nora",
    body: clampPushText(who && !notice.title.includes(who) ? `${who}: ${body}` : body, PUSH_LIMITS.bodyMaxLength),
    target: pushTarget(item)
  };
}

/**
 * Pushes newly arrived needs-you items and newly finished threads to the user's phones, gathering items that arrive
 * together into batches. Sending is fire-and-forget: failures go to `onError` and never reach the inbox loop. Window
 * focus is deliberately ignored; the user may be away from this computer while it is in front.
 */
export function startPhonePushNotifier(deps: PhonePushNotifierDeps): () => void {
  const batchDelayMs = deps.batchDelayMs ?? PHONE_PUSH_BATCH_DELAY_MS;
  let pending: PushNotification[] = [];
  let timer: { cancel(): void } | null = null;

  const report = (error: unknown): void => { try { deps.onError?.(error); } catch { /* Reporting must not throw. */ } };
  const flush = (): void => {
    timer?.cancel(); timer = null;
    const queued = pending; pending = [];
    for (let index = 0; index < queued.length; index += PUSH_LIMITS.maxNotificationsPerRequest) {
      const batch = queued.slice(index, index + PUSH_LIMITS.maxNotificationsPerRequest);
      void Promise.resolve().then(() => deps.send(batch)).catch(report);
    }
  };

  const stopWatching = watchInboxArrivals({ inbox: deps.inbox, select: (snapshot) => phonePushItems(snapshot, deps.now()) }, (_snapshot, arrived) => {
    try {
      if (!arrived.length || !deps.enabled()) return;
      pending.push(...arrived.map(phonePushNotification));
      if (pending.length >= PUSH_LIMITS.maxNotificationsPerRequest) flush();
      else timer ??= deps.setTimeout(flush, batchDelayMs);
    } catch (error) { report(error); }
  });
  return () => { stopWatching(); timer?.cancel(); timer = null; pending = []; };
}
