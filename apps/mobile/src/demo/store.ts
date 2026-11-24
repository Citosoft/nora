import { applyConversationEvent } from "@shared/conversations/conversationView";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { DemoStore } from "@/types/demo.types";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { seedThreads } from "./seed";

export function createDemoStore(now: () => string) {
  const listeners = new Set<(events: readonly ConversationEvent[]) => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const threads = seedThreads(now());
  const events: ConversationEvent[] = [];
  let cursor = 0;
  let disposed = false;
  const store: DemoStore = {
    threads, events, now,
    find(id) {
      const thread = threads.get(id);
      if (!thread) throw new RemoteRequestError("runtime", { kind: "api", status: 404, code: "not-found", message: "This demo chat is no longer available." });
      return thread;
    },
    emit(conversationId, payload) {
      if (disposed) return;
      const event: ConversationEvent = { schemaVersion: 1, id: `demo-event-${++cursor}`, conversationId, cursor, at: now(), payload };
      threads.set(conversationId, applyConversationEvent(store.find(conversationId), event));
      events.push(event);
      for (const listener of listeners) listener([event]);
    },
    receipt: (commandId, conversationId) => ({ commandId, conversationId, cursor, acceptedAt: now() }),
    schedule(action, delay) {
      const timer = setTimeout(() => { timers.delete(timer); if (!disposed) action(); }, delay);
      timers.add(timer);
    }
  };
  return {
    store,
    subscribe(listener: (events: readonly ConversationEvent[]) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { disposed = true; for (const timer of timers) clearTimeout(timer); timers.clear(); listeners.clear(); }
  };
}
