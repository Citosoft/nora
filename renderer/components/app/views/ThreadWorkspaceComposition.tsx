import { useEffect, useMemo } from "react";
import { ThreadNavigationContext, ThreadCenterContext, ThreadTabsContext } from "@/components/app/context/threadWorkspaceContext";
import { useThreadWorkspaceSnapshot } from "@/components/app/hooks/useThreadWorkspaceSnapshot";
import { threadDocumentTitle } from "@/components/app/logic/thread-workspace/changes";
import type { ThreadWorkspaceCompositionProps, ThreadNavigationPorts, ThreadCenterPorts, ThreadTabsPorts } from "@/components/app/types/thread-workspace/ports.types";

/** Region providers mount inside Nora's shell; this component renders no replacement chrome or layout. */
export function ThreadWorkspaceComposition({ store, children }: ThreadWorkspaceCompositionProps) {
  const state = useThreadWorkspaceSnapshot(store);
  useEffect(() => store.start(), [store]);
  const actions = useMemo(() => ({
    focusWorkspace: store.focusWorkspace,
    openDraft: (workspaceId: string) => { store.openDraft({ workspaceId }); },
    openRow: (row: Parameters<ThreadNavigationPorts["openRow"]>[0]) => {
      if (row.target.kind === "draft") store.focusDocument(row.target.documentId);
      else store.openThread(row.target.conversationId);
    },
    togglePin: store.togglePin, refresh: () => { void store.refresh(); }
  }), [store]);
  const navigation = useMemo<ThreadNavigationPorts>(() => ({ state, ...actions }), [state, actions]);
  const center = useMemo<ThreadCenterPorts>(() => ({ state, store }), [state, store]);
  const tabs = useMemo<ThreadTabsPorts>(() => ({
    documents: state.layout.openIds.flatMap((id) => {
      const entry = state.layout.documents.find((document) => document.id === id);
      return entry?.workspaceId === state.layout.focusedWorkspaceId ? [entry] : [];
    }),
    titles: Object.fromEntries(state.layout.documents.map((entry) => [entry.id, threadDocumentTitle(entry, state.summaries)])),
    activeId: state.layout.activeId, focus: store.focusDocument, close: store.closeDocument
  }), [state.layout, state.summaries, store]);
  return <ThreadNavigationContext.Provider value={navigation}><ThreadTabsContext.Provider value={tabs}>
    <ThreadCenterContext.Provider value={center}>{children}</ThreadCenterContext.Provider>
  </ThreadTabsContext.Provider></ThreadNavigationContext.Provider>;
}
