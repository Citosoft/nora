import { useCallback, useMemo, useState } from "react";
import { inboxTarget } from "@shared/inbox/projection";
import { buildInboxSections, inboxViewCounts, unreadUpdateIds } from "@/components/app/logic/inbox/sections";
import { useInbox } from "./useInbox";
import { useInboxOpen } from "./useInboxOpen";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useThreadTime } from "./useThreadTime";
import { useThreadWorkspaceSnapshot } from "./useThreadWorkspaceSnapshot";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import type { InboxActions, InboxPageModel, InboxView } from "@/components/app/types/inbox.types";

/** Everything the Inbox page shows and does: the chosen view, scope and search, its sections, and the item actions. */
export function useInboxView(): InboxPageModel {
  const { state, store } = useInbox();
  const { open } = useInboxOpen();
  const native = useNativeRuntimePorts();
  const threads = useThreadWorkspaceSnapshot(native.store);
  const navigation = useWorkspaceNavigation();
  const time = useThreadTime();
  const now = useMemo(() => new Date(time).toISOString(), [time]);
  const [query, setQuery] = useState("");
  const [workspaceOnly, setWorkspaceOnly] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const view = navigation.preferences.inboxView;
  const focusedId = threads.layout.focusedWorkspaceId;
  const workspace = native.boot.workspaces.find((entry) => entry.id === focusedId) ?? null;
  const workspaceId = workspaceOnly && workspace ? workspace.id : null;
  const items = state.snapshot.items;
  const sections = useMemo(() => buildInboxSections(items, { view, workspaceId, query }, now), [items, view, workspaceId, query, now]);
  const counts = useMemo(() => inboxViewCounts(items, workspaceId, now), [items, workspaceId, now]);
  const execute = useCallback(async (command: Parameters<InboxActions["execute"]>[0]) => {
    setActionError(null);
    try { await store.execute(command); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "The inbox could not be updated."); throw cause; }
  }, [store]);
  const actions = useMemo<InboxActions>(() => ({
    open: (item) => open(inboxTarget(item)),
    async respond(item, response) {
      await native.store.client.execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: item.conversation.id, requestId: item.request.id, response });
    },
    execute
  }), [open, native.store.client, execute]);
  const unread = useMemo(() => unreadUpdateIds(sections), [sections]);
  return {
    view, counts, sections, now, actions, query, setQuery,
    setView: (next: InboxView) => navigation.setPreferences((current) => ({ ...current, inboxView: next })),
    scope: workspace ? { workspaceName: workspace.name, workspaceOnly, setWorkspaceOnly } : null,
    loading: state.loading, error: actionError ?? state.error,
    markAllRead: unread.length ? () => { void execute({ kind: "mark-read", itemIds: unread.slice(0, 500) }).catch(() => { /* Shown as the page error. */ }); } : null
  };
}
