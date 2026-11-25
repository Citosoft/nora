import { TranscriptHistory } from "@/components/app/shared/TranscriptHistory";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CHAT_TAB } from "@/components/app/logic/chatTabs";
import { useChatTabs } from "@/components/app/hooks/useChatTabs";
import { chatBranchOrigin } from "@shared/bots/branches/origin";
import { ChatBranchView } from "./ChatBranchView";
import { ChatCloseThreadDialog } from "./ChatCloseThreadDialog";
import { DIRECT_BINDING, GROUP_BINDING } from "@shared/bots/chats";
import { effectiveBots } from "@shared/bots/catalog";
import { findChatBot, isNoraChat } from "@shared/bots/noraChat";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useThreadLinks } from "@/components/app/hooks/useThreadLinks";
import { useTranscriptFollow } from "@/components/app/hooks/useTranscriptFollow";
import { buildChatActivity } from "@/components/app/logic/chatActivity";
import { buildChatTimeline } from "@/components/app/logic/chatTimeline";
import { chatParticipants } from "@/components/app/logic/chatParticipants";
import { executionFailureMessage } from "@/components/app/logic/executionFailureMessage";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { NativeQueue } from "@/components/app/panels/conversations/NativeQueue";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatGreeting } from "./ChatGreeting";
import { ChatTranscript } from "./ChatTranscript";
import { ChatTyping } from "./ChatTyping";
import { ChatRequests } from "./ChatRequests";
import { ChatComposer } from "./ChatComposer";
import { canForceEndThread } from "@/components/app/logic/threadStopControl";
import { ConnectorAuthPromptStack } from "@/components/app/panels/conversations/ConnectorAuthPromptStack";
import { SecretPromptStack } from "@/components/app/panels/conversations/SecretPromptStack";
import { ChatWorkspacePicker } from "./ChatWorkspacePicker";
import { useDirectChatFollowsWorkspace } from "@/components/app/hooks/useDirectChatFollowsWorkspace";
import type { ComposerEditorHandle } from "@/components/app/types/composerEditor.types";
import type { ChatTranscriptProps } from "@/components/app/types/chatPanels.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";
import type { ChatSidebarThreads } from "@/components/app/types/chatThreadDetail.types";

/**
 * A bot chat (direct or group) as a messaging app: only what was said, a typing line while a bot works, and approvals as cards.
 * Everything the bots do happens in their work threads, linked from each reply.
 */
export function ChatConversationPanel() {
  const ports = useNativeConversationPorts();
  const { client, document, workspace, runtime, setText, setBinding, submit, execute } = ports;
  const conversationId = document.target.kind === "thread" ? document.target.conversationId : null;
  const { view, error: loadError, older, reload } = useNativeConversation({ client, conversationId });
  const header = view?.header ?? null;
  const composer = useRef<ComposerEditorHandle>(null);
  const transcript = useTranscriptFollow(view?.items);
  const onLinkClick = useThreadLinks(workspace.workspace.path);
  const bots = useMemo(() => effectiveBots(ports.state.personalization.bots, workspace.id, ports.state.sharedBots),
    [ports.state.personalization.bots, ports.state.sharedBots, workspace.id]);
  const { direct: draftDirect, group: draftGroup } = document;
  const participants = useMemo(() => chatParticipants(header?.conversation ?? null, { direct: draftDirect, group: draftGroup }, bots),
    [header?.conversation, draftDirect, draftGroup, bots]);
  const binding = participants?.kind === "group" ? GROUP_BINDING : DIRECT_BINDING;
  // Chats run on Nora's coordinators; the bots answer with their own models, so the send-ready binding is fixed.
  useEffect(() => { setBinding(binding, "inherited"); }, [binding, setBinding]);
  const entries = useMemo(() => buildChatTimeline(view?.items ?? [], ports.workThreads), [view?.items, ports.workThreads]);
  const activity = useMemo(() => {
    const workIds = new Set(ports.botWorkThreads.map((thread) => thread.id));
    return buildChatActivity(view?.items ?? [], ports.workThreads.filter((thread) => workIds.has(thread.id)));
  }, [view?.items, ports.workThreads, ports.botWorkThreads]);
  const workThreads = useMemo(() => new Map(ports.workThreads.map((thread) => [thread.id, thread])), [ports.workThreads]);
  const chatTabs = useChatTabs(ports.workThreads, document.workspaceId);
  const { tab, startDraft } = chatTabs;
  const branchFromMessage = useCallback<NonNullable<ChatTranscriptProps["onBranch"]>>((entry) => {
    if (entry.author) startDraft(entry.author.botId,
      chatBranchOrigin({ ...entry, role: entry.from === "user" ? "user" : "assistant", author: entry.author }));
  }, [startDraft]);
  const tabThread = workThreads.get(tab) ?? null;
  const tabDraft = chatTabs.drafts.find((draft) => draft.key === tab) ?? null;
  const [closing, setClosing] = useState<string | null>(null);
  const confirmClose = async (threadId: string): Promise<void> => {
    await ports.settleThread(threadId);
    setClosing(null);
    if (chatTabs.tab === threadId) chatTabs.select(CHAT_TAB);
  };

  const active = header?.activeRuns[0];
  const busy = runtime.busy;
  const pending = document.pending;
  const settled = !!header?.conversation.archivedAt;
  const executionFailure = active ? active.failure : ports.latestFailure;
  const current = active ? [...ports.workThreads].filter((thread) => thread.working || thread.waiting).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null : null;
  const speaker = participants?.kind === "direct" ? participants.bot : participants?.members.find((member) => member.botId === current?.botId) ?? null;
  const avatarState: BotAvatarState = settled ? "settled" : current?.waiting ? "waiting" : active ? "thinking" : executionFailure ? "failed" : "idle";
  const text = pending?.submit.instruction ?? document.text;
  const canSend = !busy && !settled && (!conversationId || !!header) && (!!pending || (!!runtime.readyBinding && !!document.text.trim()));
  const stoppable = !!active && !canForceEndThread(active.state);
  const endTurn = active && canForceEndThread(active.state)
    ? () => void execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })
    : null;
  const mentions = useMemo(() => participants?.kind === "group" ? participants.members.map((member) => ({ id: member.botId, name: member.name,
    detail: member.role || undefined, icon: <BotAvatar avatar={member.avatar} size={20} /> })) : undefined, [participants]);
  const transcriptMentions = useMemo(() => mentions ?? bots.map(({ bot }) => ({ id: bot.id, name: bot.name,
    detail: bot.role || undefined, icon: <BotAvatar avatar={bot.avatar} size={20} /> })), [mentions, bots]);
  const direct = participants?.kind === "direct" ? participants.bot : null;
  const chatWorkspaces = useMemo(() => direct ? ports.state.workspaces.filter((entry) => entry.workspace.environmentId === ports.state.environmentId
    && !!findChatBot(ports.state.personalization.bots, entry.id, ports.state.sharedBots, direct.botId)) : [],
  [direct, ports.state.workspaces, ports.state.environmentId, ports.state.personalization.bots, ports.state.sharedBots]);
  const savedDirect = header?.conversation.direct;
  useDirectChatFollowsWorkspace(header?.conversation ?? null, document.workspaceId, chatWorkspaces, execute);
  // Where new work starts: a direct chat's chosen workspace (it follows the one you open it in), or a group's own.
  const workingWorkspaceId = savedDirect?.workspaceId ?? header?.conversation.workspace.projectId ?? workspace.id;
  const workingWorkspaceName = ports.state.workspaces.find((entry) => entry.id === workingWorkspaceId)?.name ?? null;
  const contextRevision = `${header?.cursor ?? 0}:${ports.workThreads.map((thread) => `${thread.id}@${thread.updatedAt}`).join(",")}`;
  const context = useMemo(() => ({ chatId: savedDirect ? conversationId : null, draft: document.text, revision: contextRevision }),
    [savedDirect, conversationId, document.text, contextRevision]);
  // Nora has no connector selection of its own; its threads use the account's connectors like any other Nora thread.
  const connectorSubject = useMemo(() => direct && !isNoraChat(direct.botId) ? { workspaceId: workingWorkspaceId, botId: direct.botId } : null, [direct, workingWorkspaceId]);
  const footer = direct ? <ChatWorkspacePicker workspaces={chatWorkspaces} selectedId={workingWorkspaceId}
    fixed={!savedDirect || savedDirect.scope.kind === "workspace"} disabled={busy || settled}
    onSelect={(workspaceId) => { if (header) void execute({ kind: "set-direct-workspace", commandId: crypto.randomUUID(), conversationId: header.conversation.id, workspaceId }); }} /> : undefined;
  const error = runtime.error ?? ports.storageError ?? (executionFailure ? executionFailureMessage(executionFailure) : pending && !busy ? "Delivery is unconfirmed. Retry sends the same saved message." : null);
  if (!participants) return <section className="p-6 text-sm text-muted-foreground" role="status">This chat's bots are no longer available in this workspace.</section>;
  const name = participants.kind === "direct" ? participants.bot.name : "the group";
  const botOf = (botId: string | null) => participants.kind === "direct" ? participants.bot : participants.members.find((member) => member.botId === botId) ?? null;
  const branchTarget = tabThread ? { kind: "thread" as const, thread: tabThread } : tabDraft ? { kind: "draft" as const, draft: tabDraft } : null;
  const branchBot = tabThread ? tabThread.author ?? botOf(tabThread.botId) : tabDraft ? botOf(tabDraft.botId) : null;
  // Only a saved, current chat can be reset; a reset one is settled history, and a draft has nothing to reset.
  const reset = savedDirect && !savedDirect.retiredAt ? { disabled: busy || !!active || !!pending, run: ports.resetDirectChat } : null;
  const sidebarThreads: ChatSidebarThreads = { chatId: conversationId, onOpenFull: ports.openThread, resolve: (threadId) => {
    const thread = workThreads.get(threadId);
    const bot = thread ? thread.author ?? botOf(thread.botId) : null;
    return thread && bot ? { thread, bot } : null;
  } };
  return <Tabs value={tab} onValueChange={chatTabs.select} asChild><section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={participants.kind === "direct" ? `Chat with ${participants.bot.name}` : "Group chat"}>
    <ChatHeader participants={participants} tabs={chatTabs.tabs} drafts={chatTabs.drafts}
      onNewBranch={conversationId ? (botId) => chatTabs.startDraft(botId) : undefined} onCloseDraft={chatTabs.closeDraft} onCloseThread={setClosing} />
    <ChatCloseThreadDialog thread={closing ? workThreads.get(closing) ?? null : null} onCancel={() => setClosing(null)} onConfirm={confirmClose} />
    <TabsContent value={CHAT_TAB} className="flex min-h-0 flex-1">
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <TranscriptHistory scrollRef={transcript.ref} onNavigate={transcript.pauseFollowing}>
    <div ref={transcript.ref} onWheel={transcript.onWheel} onScroll={transcript.onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-10 pr-5 pb-6">
      <div className="mx-auto max-w-[760px]">
        {loadError && <div role="alert" className="mt-4"><p>{loadError}</p><Button onClick={reload}>Reload chat</Button></div>}
        {view?.nextBefore && <div className="mt-4 flex justify-center"><Button variant="ghost" size="sm" onClick={() => void older()}>Load earlier messages</Button></div>}
        {conversationId && !view && !loadError && <p className="mt-4 text-muted-foreground">Loading chat…</p>}
        {!entries.length && !conversationId && <ChatGreeting participants={participants} />}
        <ChatTranscript entries={entries} workThreads={workThreads} onOpenThread={ports.openThread} onLinkClick={onLinkClick} mentions={transcriptMentions}
          onBranch={conversationId ? branchFromMessage : undefined} />
        {header && <ChatRequests conversationId={header.conversation.id} />}
        {active && speaker && <ChatTyping botId={speaker.botId} name={speaker.name} avatar={speaker.avatar} workspaceName={current?.workspaceName ?? null} waiting={!!current?.waiting} />}
      </div>
    </div>
    </TranscriptHistory>
    {transcript.newActivity && <Button variant="secondary" size="sm" className="mx-auto mb-3 rounded-full" onClick={transcript.jumpToLatest}>
      <ArrowDown className="size-3.5" aria-hidden="true" />Jump to latest</Button>}
    {/* Each tab has its own composer: here messages go to the chat, in a branch tab straight to that branch. */}
    <div className="mx-auto w-full max-w-[808px] space-y-2 px-4 pb-5 sm:px-6">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {/* Bots answer a chat from their own threads, so their secret prompts surface here, where the user is. */}
      {conversationId && <ConnectorAuthPromptStack conversationId={conversationId} />}
      {conversationId && <SecretPromptStack conversationId={conversationId} />}
      {endTurn && <div className="flex flex-wrap items-center gap-2">
        {active?.state === "recovering" && <Button type="button" size="sm" variant="outline" disabled={busy}
          onClick={() => void execute({ kind: "reconcile", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })}>Check status</Button>}
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={endTurn}
          aria-label={active?.state === "stopping" ? "End turn that is still stopping" : "End turn whose outcome is unconfirmed"}>End turn</Button>
      </div>}
      {header && <NativeQueue conversationId={header.conversation.id} runs={header.queuedRuns} paused={header.conversation.queuePaused} busy={busy} execute={execute} />}
      <ChatComposer inputRef={composer} value={text} disabled={!!pending || settled} canSend={canSend} mentions={mentions} footer={footer}
        placeholder={settled ? "Reopen this chat to continue" : `Message ${name}`}
        sendLabel={pending ? "Retry saved message" : active ? "Queue message" : "Send message"}
        stop={stoppable && active ? { label: "Stop", disabled: busy,
          onStop: () => void execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id }) } : null}
        onChange={setText} onSubmit={() => { if (canSend) { transcript.jumpToLatest(); void submit(); } }} />
    </div>
    </div>
    <ChatSidebar bot={direct ? { bot: direct, state: avatarState, reset } : null} context={context} connectors={connectorSubject} threads={sidebarThreads}
      work={{ activity, threads: ports.botWorkThreads, onSettleThread: ports.settleThread }} />
    </TabsContent>
    {branchTarget && branchBot && <TabsContent value={tab} className="flex min-h-0 flex-1 flex-col">
      <ChatBranchView key={tab} target={branchTarget} bot={branchBot} chatId={conversationId} composer={chatTabs.composer(tab)}
        onComposerChange={(patch) => chatTabs.updateComposer(tab, patch)} onStarted={(threadId) => chatTabs.markStarted(tab, threadId)}
        onOpenThread={ports.openThread} onLinkClick={onLinkClick} mentions={transcriptMentions} chatWorkspaceName={workingWorkspaceName} /></TabsContent>}
  </section></Tabs>;
}
