import { unreadThreadIds } from "@shared/inbox/projection";
import type { InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxState, InboxStore, InboxStoreDeps } from "@/components/app/types/inbox.types";

const describe = (cause: unknown, fallback: string): string => cause instanceof Error ? cause.message : fallback;

/** The window's copy of main's inbox: one listener on pushed snapshots, shared by every inbox surface and the thread list. */
export function createInboxStore(deps: InboxStoreDeps): InboxStore {
  let state: InboxState = { snapshot: { items: [] }, loading: true, error: null };
  let unread: readonly string[] = [];
  const listeners = new Set<() => void>();
  // Views re-report the thread on screen on every publish; only one read is sent per thread until its update clears.
  const reading = new Set<string>();
  let users = 0, generation = 0;
  let stop = (): void => {};
  const publish = (next: InboxState): void => {
    if (next.snapshot !== state.snapshot) unread = unreadThreadIds(next.snapshot.items);
    state = next;
    for (const id of [...reading]) if (!unread.includes(id)) reading.delete(id);
    for (const listener of [...listeners]) { try { listener(); } catch { /* A view cannot block the inbox. */ } }
  };
  const accept = (snapshot: InboxSnapshot): void => publish({ snapshot, loading: false, error: null });
  const store: InboxStore = {
    state: () => state,
    unreadThreadIds: () => unread,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() {
      if (++users === 1) {
        const current = ++generation;
        const unsubscribe = deps.client.onChanged((snapshot) => { if (current === generation) accept(snapshot); });
        void deps.client.list().then((snapshot) => { if (current === generation) accept(snapshot); },
          (cause: unknown) => { if (current === generation) publish({ ...state, loading: false, error: describe(cause, "The inbox could not be loaded.") }); });
        stop = () => { generation++; unsubscribe(); };
      }
      let closed = false;
      return () => { if (closed) return; closed = true; if (--users === 0) stop(); };
    },
    async execute(command) {
      try { accept(await deps.client.execute(command)); }
      catch (cause) { const message = describe(cause, "The inbox could not be updated."); publish({ ...state, error: message }); throw new Error(message); }
    },
    markThreadRead(conversationId) {
      if (!unread.includes(conversationId) || reading.has(conversationId)) return;
      reading.add(conversationId);
      void store.execute({ kind: "mark-thread-read", conversationId }).catch(() => { reading.delete(conversationId); });
    }
  };
  return store;
}
