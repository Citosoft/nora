import { useMemo } from "react";
import { NativeConversationContext } from "@/components/app/context/nativeConversationContext";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { NativeConversationPanel } from "@/components/app/panels/conversations/NativeConversationPanel";
import type { NativeConversationPorts } from "@/components/app/types/nativePanels.types";
import type { ThreadViewContentProps } from "@/components/app/types/thread-workspace/ports.types";

/** The same document reference can be mounted by a tab or a grid pane. */
export function ThreadViewContent({ documentId }: ThreadViewContentProps) {
  const { state, store, userDisplayName } = useThreadCenterPorts();
  const readBranchRequest = useOptionalWorkspaceSidebarPorts()?.readBranchRequest ?? null;
  const document = state.layout.documents.find((entry) => entry.id === documentId);
  const workspace = state.boot.workspaces.find((entry) => entry.id === document?.workspaceId);
  const conversationId = document?.target.kind === "thread" ? document.target.conversationId : null;
  const latestFailure = state.summaries.find((summary) => summary.conversation.id === conversationId)?.latestRun?.failure ?? null;
  const actions = useMemo(() => ({
    setText: (text: string) => store.setText(documentId, text),
    setBinding: (binding: Parameters<NativeConversationPorts["setBinding"]>[0]) => store.setBinding(documentId, binding),
    submit: () => store.submit(documentId),
    execute: (command: Parameters<NativeConversationPorts["execute"]>[0]) => store.execute(documentId, command),
    selectWorkspace: (workspaceId: string) => store.selectWorkspace(documentId, workspaceId)
  }), [store, documentId]);
  const ports = useMemo<NativeConversationPorts | null>(() => document && workspace ? { client: store.client, workspace, state: state.boot, userDisplayName, readBranchRequest,
    document, runtime: state.runtime[documentId] ?? { busy: false, error: null, readyBinding: null }, storageError: state.storageError, latestFailure, ...actions } : null,
  [store.client, workspace, state.boot, document, state.runtime, state.storageError, latestFailure, actions, documentId, userDisplayName, readBranchRequest]);
  if (!ports) return <section className="p-6 text-sm text-muted-foreground" role="status">This thread's workspace is unavailable on its owning host. Its saved draft has been retained.</section>;
  return <NativeConversationContext.Provider value={ports}><NativeConversationPanel /></NativeConversationContext.Provider>;
}
