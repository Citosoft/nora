import { useMemo } from "react";
import { NativeConversationContext } from "@/components/app/context/nativeConversationContext";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { useOptionalSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { NativeConversationPanel } from "@/components/app/panels/conversations/NativeConversationPanel";
import type { NativeConversationPorts } from "@/components/app/types/nativePanels.types";
import type { ThreadViewContentProps } from "@/components/app/types/thread-workspace/ports.types";

/** The same document reference can be mounted by a tab or a grid pane. */
export function ThreadViewContent({ documentId }: ThreadViewContentProps) {
  const { state, store, userDisplayName } = useThreadCenterPorts();
  const threadForge = useOptionalWorkspaceSidebarPorts()?.threadForge ?? null;
  const sessionCenter = useOptionalSessionCenterPorts();
  const openThreadSettings = sessionCenter?.onOpenThreadSettings;
  const openBotSettings = sessionCenter?.onOpenBotSettings;
  const document = state.layout.documents.find((entry) => entry.id === documentId);
  const workspace = state.boot.workspaces.find((entry) => entry.id === document?.workspaceId);
  const conversationId = document?.target.kind === "thread" ? document.target.conversationId : null;
  const latestFailure = state.summaries.find((summary) => summary.conversation.id === conversationId)?.latestRun?.failure ?? null;
  const visible = state.layout.activeId === documentId;
  const actions = useMemo(() => ({
    addThreadReference: (id: string) => store.addThreadReference(documentId, id),
    removeThreadReference: (id: string) => store.removeThreadReference(documentId, id),
    addAttachments: (files: Parameters<NativeConversationPorts["addAttachments"]>[0]) => store.addAttachments(documentId, files),
    removeAttachment: (id: string) => store.removeAttachment(documentId, id),
    setText: (text: string) => store.setText(documentId, text),
    setBinding: (...[binding, origin]: Parameters<NativeConversationPorts["setBinding"]>) => store.setBinding(documentId, binding, origin),
    submit: () => store.submit(documentId),
    execute: (command: Parameters<NativeConversationPorts["execute"]>[0]) => store.execute(documentId, command),
    compact: () => store.compact(documentId),
    selectWorkspace: (workspaceId: string) => store.selectWorkspace(documentId, workspaceId),
    selectBot: (botId: string | null) => store.selectBot(documentId, botId),
    openThread: (id: string) => store.openThread(id)
  }), [store, documentId]);
  const memberThreads = useMemo(() => new Map(state.summaries.flatMap(({ conversation }) => conversationId && conversation.parentId === conversationId
    && conversation.bot && !conversation.archivedAt ? [[conversation.bot.botId, conversation.id] as const] : [])), [state.summaries, conversationId]);
  const referenceChoices = useMemo(() => state.summaries.filter((summary) => summary.conversation.id !== conversationId
    && summary.conversation.workspace.environmentId === state.boot.environmentId).map(({ conversation }) => ({ id: conversation.id, title: conversation.title,
      workspace: state.boot.workspaces.find((entry) => entry.id === conversation.workspace.projectId)?.name ?? conversation.workspace.path, settled: !!conversation.archivedAt })),
    [state.summaries, state.boot.environmentId, state.boot.workspaces, conversationId]);
  const ports = useMemo<NativeConversationPorts | null>(() => document && workspace ? { visible, client: store.client, workspace, state: state.boot, userDisplayName, threadForge, openThreadSettings, openBotSettings, referenceChoices, memberThreads,
    document, runtime: state.runtime[documentId] ?? { busy: false, error: null, readyBinding: null }, storageError: state.storageError, latestFailure, ...actions } : null,
  [visible, store.client, workspace, state.boot, document, state.runtime, state.storageError, latestFailure, actions, documentId, userDisplayName, threadForge, openThreadSettings, openBotSettings, referenceChoices, memberThreads]);
  if (!ports) return <section className="p-6 text-sm text-muted-foreground" role="status">This thread's workspace is unavailable on its owning host. Its saved draft has been retained.</section>;
  return <NativeConversationContext.Provider value={ports}><NativeConversationPanel /></NativeConversationContext.Provider>;
}
