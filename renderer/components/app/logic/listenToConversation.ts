import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { ConversationListener } from "@/components/app/types/conversationClient.types";
import { ConversationAccessError } from "@shared/conversations/errors";

/** Hints only wake a bounded cursor drain. Register locally before the remote watch handshake. */
export function listenToConversation(bridge: ConversationBridge, environmentId: string, listener: ConversationListener): () => void {
  const watchId = crypto.randomUUID();
  const route = { schemaVersion: 1 as const, environmentId, watchId };
  let cursor = listener.after;
  let target = cursor;
  let draining = false;
  let closed = false;
  let removeListener = (): void => {};
  const close = (): void => {
    if (closed) return;
    closed = true; removeListener();
    void bridge.unwatch(route).catch(() => {});
  };
  const fail = (error: Error): void => {
    if (closed) return;
    close();
    try { listener.onError(error); } catch { /* View failures cannot change committed execution. */ }
  };
  const drain = async (): Promise<void> => {
    if (draining || closed) return;
    draining = true;
    try {
      while (!closed && cursor < target) {
        const requestedTarget = target;
        const value = await bridge.read({ schemaVersion: 1, environmentId, kind: "events", conversationId: listener.conversationId, after: cursor, limit: 200 });
        if (closed) return;
        if (value.kind !== "events" || value.page.after !== cursor || value.page.nextCursor < cursor) {
          throw new ConversationAccessError({ code: "cursor", message: "Conversation replay is incompatible; reload its history" });
        }
        if (!value.page.events.length) { cursor = requestedTarget; continue; } // Global cursors can contain only other conversations.
        for (const event of value.page.events) {
          if (closed) return;
          if (event.cursor <= cursor || (listener.conversationId && event.conversationId !== listener.conversationId)) {
            throw new ConversationAccessError({ code: "cursor", message: "Conversation replay is out of order; reload its history" });
          }
          cursor = event.cursor; listener.onEvent(event);
        }
        if (cursor !== value.page.nextCursor) throw new ConversationAccessError({ code: "cursor", message: "Conversation replay cursor does not match its events" });
      }
    } catch (error) { fail(error instanceof Error ? error : new Error("Conversation replay failed")); }
    finally { draining = false; }
  };
  removeListener = bridge.onCursor((hint) => {
    if (hint.environmentId !== environmentId || hint.watchId !== watchId || closed) return;
    target = Math.max(target, hint.cursor); void drain();
  });
  void bridge.watch({ ...route, conversationId: listener.conversationId }).then((receipt) => {
    if (closed) { void bridge.unwatch(route).catch(() => {}); return; }
    if (receipt.cursor < listener.after) { fail(new ConversationAccessError({ code: "cursor", message: "Conversation cursor is unavailable; reload its history" })); return; }
    target = Math.max(target, receipt.cursor); void drain();
  }).catch((error: unknown) => fail(error instanceof Error ? error : new Error("Conversation watch failed")));
  return close;
}
