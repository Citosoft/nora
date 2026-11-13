import { executionFailureMessage } from "@/components/app/logic/executionFailureMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Settings, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NativeComposerAttachments } from "./NativeComposerAttachments";
import { NativeThreadReferences } from "./NativeThreadReferences";
import { NativeThreadReferenceChips } from "./NativeThreadReferenceChips";
import { useComposerAttachments } from "@/components/app/hooks/useComposerAttachments";
import { NativeComposerInput } from "./NativeComposerInput";
import { selectPromptSuggestion } from "@/components/app/logic/promptSuggestion";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useThreadInsights } from "@/components/app/hooks/useThreadInsights";
import { useThreadLinks } from "@/components/app/hooks/useThreadLinks";
import { useThreadConnectors } from "@/components/app/hooks/useThreadConnectors";
import { useThreadSkills } from "@/components/app/hooks/useThreadSkills";
import { useOnceVisible } from "@/components/app/hooks/useOnceVisible";
import { useConnectorSignInRefresh } from "@/components/app/hooks/useConnectorSignInRefresh";
import { roleProfile } from "@shared/personalization/profiles";
import { getGreetingFirstName } from "@/components/app/logic/thread-workspace/greeting";
import { ThreadWorkspacePicker } from "../threads/ThreadWorkspacePicker";
import { ThreadCheckoutPicker } from "../threads/ThreadCheckoutPicker";
import { NativeProviderPicker } from "./NativeProviderPicker";
import { NativeTimeline } from "./NativeTimeline";
import { MemberThreadsToggle } from "@/components/app/panels/threads/MemberThreadsToggle";
import { useMemberThreadVisibility } from "@/components/app/hooks/useMemberThreadVisibility";
import { NativeRequestStack } from "./NativeRequestStack";
import { NativeQueue } from "./NativeQueue";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { ThreadInsightsPanel } from "./ThreadInsightsPanel";
import { ThreadContextUsage } from "./ThreadContextUsage";
import { nativeProviderLabel } from "@/components/app/logic/nativeProviderLabel";
import { threadPreferences } from "@shared/personalization/threads";
import { effectiveBots } from "@shared/bots/catalog";
import { botBindingSeed, botModelRevertSeed, isBotModelOverride } from "@/components/app/logic/botThreads";
import { botConversationState } from "@/components/app/logic/botConversationState";
import { ThreadBotPicker } from "../threads/ThreadBotPicker";
import { NativeBotGreeting } from "./NativeBotGreeting";
import { NativeGroupGreeting } from "./NativeGroupGreeting";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { ThreadGroupMembers } from "../threads/ThreadGroupMembers";
import { GROUP_BINDING } from "@shared/bots/groups";

const NO_ITEMS: readonly TimelineItem[] = [];

export function NativeConversationPanel() {
  const ports = useNativeConversationPorts();
  const { client, document, workspace, runtime, setText, setBinding, submit, execute } = ports;
  const conversationId = document.target.kind === "thread" ? document.target.conversationId : null;
  const { view, error: loadError, older, reload } = useNativeConversation({ client, conversationId });
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [newActivity, setNewActivity] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const [capabilities, setCapabilities] = useState<ProviderCapabilities | null>(null);
  const header = view?.header;
  const onLinkClick = useThreadLinks(header?.conversation.workspace.path ?? workspace.workspace.path);
  const { visibility: memberThreadVisibility } = useMemberThreadVisibility();
  const insights = useThreadInsights({ header, items: view?.items ?? [], workspace, hasOlderHistory: !!view?.nextBefore, forge: ports.threadForge });
  const providerLabel = header ? nativeProviderLabel(ports.state.providers, header.conversation.provider) : null;
  // Restored tabs stay mounted while hidden; each discovery starts a provider runtime, so only shown threads discover.
  const discover = useOnceVisible(ports.visible);
  const connectors = useThreadConnectors(client, discover && header && providerLabel !== null ? { conversation: header.conversation, providerLabel } : null);
  const skills = useThreadSkills(client, discover && header ? { conversation: header.conversation, items: view?.items ?? NO_ITEMS } : null);
  useConnectorSignInRefresh(header?.conversation.id ?? null, view?.items ?? NO_ITEMS, connectors);
  const active = header?.activeRuns[0];
  const executionFailure = active ? active.failure : ports.latestFailure;
  const bots = useMemo(() => effectiveBots(ports.state.personalization.bots, workspace.id, ports.state.sharedBots),
    [ports.state.personalization.bots, ports.state.sharedBots, workspace.id]);
  const currentBot = header?.conversation.bot ?? null;
  const draftBot = !conversationId && document.botId ? bots.find((entry) => entry.bot.id === document.botId)?.bot ?? null : null;
  // "Use the bot's model": reopen the model picker set to the bot's saved model; the next send switches with the usual handoff.
  const [botModelRevert, setBotModelRevert] = useState(0);
  const threadProvider = header?.conversation.provider ?? null;
  const threadProviderKey = JSON.stringify(threadProvider);
  useEffect(() => { setBotModelRevert(0); }, [threadProviderKey]);
  const canChangeModel = !!header && !header.activeRuns.length && !header.queuedRuns.length && !header.pendingRequests.length && !runtime.busy && !document.pending && !header.conversation.archivedAt;
  const botModelSeed = currentBot && threadProvider ? botModelRevertSeed(currentBot, threadProvider) : null;
  const groupMembers = useMemo(() => header?.conversation.group?.members
    ?? (!conversationId && document.group ? document.group.botIds.flatMap((botId) => { const member = bots.find((entry) => entry.bot.id === botId)?.bot;
      return member ? [{ botId: member.id, name: member.name, avatar: member.avatar }] : []; }) : null), [header?.conversation.group, conversationId, document.group, bots]);
  const groupWriter = header?.conversation.group?.writer ?? document.group?.writer ?? null;
  const groupLead = header?.conversation.group?.lead ?? document.group?.lead ?? null;
  const { memberThreads, openThread } = ports;
  const resolveBot = useMemo(() => (nameOrId: string) => {
    const wanted = nameOrId.trim().toLocaleLowerCase();
    const found = bots.find(({ bot }) => bot.id === wanted) ?? bots.find(({ bot }) => bot.name.toLocaleLowerCase() === wanted);
    return found ? { name: found.bot.name, avatar: found.bot.avatar } : null;
  }, [bots]);
  const onOpenAuthorThread = useMemo(() => header?.conversation.group && memberThreadVisibility === "visible" ? (botId: string) => {
    const threadId = memberThreads.get(botId);
    if (threadId) openThread(threadId);
  } : undefined, [header?.conversation.group, memberThreadVisibility, memberThreads, openThread]);
  // Groups suggest their members; Nora threads suggest the workspace's bots, which Nora asks with ask_bot. Bot threads suggest none.
  const mentionOptions = useMemo(() => groupMembers
    ? groupMembers.map((member) => ({ id: member.botId, name: member.name,
      detail: header?.conversation.group?.members.find((entry) => entry.botId === member.botId)?.role || undefined,
      icon: <BotAvatar avatar={member.avatar} size={20} /> }))
    : !currentBot && !draftBot ? bots.map(({ bot }) => ({ id: bot.id, name: bot.name, detail: bot.role || undefined, icon: <BotAvatar avatar={bot.avatar} size={20} /> }))
    : undefined, [groupMembers, header?.conversation.group, currentBot, draftBot, bots]);
  const role = header?.conversation.role?.selection ?? document.role;
  const profile = role && !draftBot && !groupMembers ? roleProfile(role) : null;
  // Group chats run on Nora's coordinator; there is no model to choose, so the send-ready binding is fixed.
  useEffect(() => { if (groupMembers) setBinding(GROUP_BINDING, "inherited"); }, [groupMembers, setBinding]);
  const firstName = getGreetingFirstName(ports.userDisplayName);
  const pending = document.pending;
  const busy = runtime.busy;
  const settled = !!header?.conversation.archivedAt;
  const attachments = document.attachments ?? [];
  const attachmentInput = useComposerAttachments({ attachments, disabled: !!pending || settled || busy, onAdd: ports.addAttachments });
  const references = document.threadReferences ?? [];
  const hasContent = !!document.text.trim() || attachments.length > 0 || references.length > 0;
  const canSend = !attachmentInput.saving && !busy && !settled && (!conversationId || !!header)
    && (!!pending || (!!runtime.readyBinding && hasContent));
  const showStop = !attachmentInput.saving && !!active && active.state !== "recovering" && !pending && !hasContent;
  const steerFollowUp = threadPreferences(ports.state.personalization).followUp === "steer" && !!capabilities?.steering
    && active?.state === "running" && !active.action && !header?.pendingRequests.length;
  const sendLabel = pending ? "Retry saved instruction" : active ? steerFollowUp ? "Steer instruction" : "Queue instruction" : "Send instruction";
  const stopLabel = active?.state === "stopping" ? "Stopping turn" : "Stop turn";
  const actionLabel = showStop ? stopLabel : busy ? "Sending instruction" : sendLabel;
  const jumpToLatest = (): void => {
    follow.current = true; setNewActivity(false);
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  };
  useEffect(() => {
    if (follow.current) transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
    else setNewActivity(true);
  }, [view?.items]);
  const chooseStarter = (text: string): void => { setText(text); composer.current?.focus(); };
  return <section className={cn("thread-conversation flex min-h-0 min-w-0 flex-1 flex-col", !conversationId && "justify-center pb-[12vh]")} aria-label={conversationId ? "Thread" : "New thread"}
    data-thread-insights={header ? insightsExpanded ? "expanded" : "collapsed" : undefined}>
    {/* A new thread sizes the transcript to its greeting so the composer sits directly beneath it. */}
    <div className={cn("relative flex min-h-0 flex-col", conversationId ? "flex-1" : "flex-initial")}>
    {header && providerLabel !== null && <ThreadInsightsPanel header={header} providerLabel={providerLabel} connectors={connectors} skills={skills} changes={insights.changes} subagents={insights.subagents} branch={insights.branch} expanded={insightsExpanded} busy={busy}
      canSettle={!active && !header.queuedRuns.length} hasOlderHistory={!!view?.nextBefore}
      onToggle={() => setInsightsExpanded((current) => !current)} onLoadHistory={() => void older()}
      onSettleChange={() => void execute({ kind: settled ? "unarchive" : "archive", commandId: crypto.randomUUID(), conversationId: header.conversation.id })} />}
    <div className={cn("thread-transcript min-h-0 overflow-y-auto overscroll-contain px-5 py-7", conversationId ? "flex-1" : "flex-initial")} ref={transcript}
      onWheel={(event) => { if (event.deltaY < 0) follow.current = false; }}
      onScroll={() => { const element = transcript.current;
        if (element) follow.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 1; }}>
      <div className="mx-auto max-w-[800px] space-y-5 text-[15px]">
        {loadError && <div role="alert"><p>{loadError}</p><Button onClick={reload}>Reload thread</Button></div>}
        {view?.nextBefore && <Button variant="ghost" onClick={() => void older()}>Load older messages</Button>}
        {conversationId && !view && !loadError && <p className="text-muted-foreground">Loading thread…</p>}
        {view && <NativeTimeline items={view.items} runs={view.runHistory.runs} onLinkClick={onLinkClick} onOpenAuthorThread={onOpenAuthorThread} connectors={connectors}
          resolveBot={resolveBot} onOpenThread={openThread} />}
        {!conversationId && <div className="mx-auto flex w-full flex-col items-center gap-7 pb-2 text-center">
          {groupMembers ? <NativeGroupGreeting members={groupMembers} workspaceName={workspace.name} />
            : draftBot ? <NativeBotGreeting bot={draftBot} workspaceName={workspace.name} /> : <div className="space-y-3"><p className="text-xs font-medium text-muted-foreground">{profile?.label ?? "Your workspace"}</p>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">What would you like to work on in <span className="text-primary">{workspace.name}</span>{firstName && <>, <span className="whitespace-nowrap text-primary">{firstName}</span></>}?</h1></div>}
          <div className="flex flex-wrap justify-center gap-2">{profile?.starters.map((starter) => <Button key={starter} variant="outline" className="h-auto max-w-full rounded-full px-4 py-2 text-left font-normal whitespace-normal"
            disabled={!!pending} onClick={() => chooseStarter(starter)}>{starter}</Button>)}</div>
        </div>}
      </div>
    </div>
    </div>
    {newActivity && <Button variant="secondary" size="sm" className="mx-auto mb-3 rounded-full" onClick={jumpToLatest}><ArrowDown className="size-3.5" aria-hidden="true" />Jump to latest</Button>}
    <div className="thread-composer">
    <div className="mx-auto w-full max-w-[848px] space-y-3 px-4 pb-5 sm:px-6">
      {header && <NativeRequestStack key={header.conversation.id} requests={header.pendingRequests} busy={busy} visible={ports.visible} onRespond={(requestId, response) => execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: header.conversation.id, requestId, response })} />}
      {active?.state === "recovering" && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void execute({ kind: "reconcile", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })}>Check native status</Button>}
      {(runtime.error || ports.storageError || executionFailure || pending) && <p role="alert" className="text-sm text-destructive">{runtime.error ?? ports.storageError ?? (executionFailure ? executionFailureMessage(executionFailure) : "Delivery is unconfirmed. Retry checks the same saved instruction.")}</p>}
      <div>
      {header && <NativeQueue conversationId={header.conversation.id} runs={header.queuedRuns} paused={header.conversation.queuePaused} busy={busy} execute={execute}
        steerTarget={capabilities?.steering && active?.state === "running" && active.nativeTurnId && !header.pendingRequests.length && !header.queuedRuns.some((run) => run.steering === "pending") ? active.id : null} />}
      <form className="relative space-y-2 rounded-lg border bg-card p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring/30" onSubmit={(event) => { event.preventDefault(); if (canSend) void submit(); }}
        onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = pending || settled || busy || attachmentInput.saving ? "none" : "copy"; } }}
        onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); void attachmentInput.addFiles(Array.from(event.dataTransfer.files)); } }}>
        <NativeComposerInput inputRef={composer} value={pending?.submit.instruction ?? document.text} disabled={!!pending || settled}
          trailingAction={ports.openThreadSettings ? <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 z-10 size-7 text-muted-foreground"
            aria-label="Open thread settings" tooltip="Thread settings" onClick={ports.openThreadSettings}><Settings className="size-4" aria-hidden="true" /></Button> : undefined}
          placeholder={settled ? "Reopen this settled thread to continue" : active ? "Queue your next instruction…" : "Ask, plan, or start something…"}
          suggestion={hasContent || attachmentInput.saving || busy || pending || loadError || runtime.error ? null : selectPromptSuggestion(view, capabilities)}
          onFiles={(files) => void attachmentInput.addFiles(files)} onChange={setText} onSubmit={() => { if (canSend) void submit(); }} mentions={mentionOptions} />
        <NativeComposerAttachments attachments={attachments} disabled={!!pending || settled || busy} saving={attachmentInput.saving}
          error={attachmentInput.error} onFiles={(files) => void attachmentInput.addFiles(files)} onRemove={ports.removeAttachment}
          trailingAction={<NativeThreadReferences references={references} choices={ports.referenceChoices} disabled={!!pending || settled || busy || attachmentInput.saving}
            onAttach={ports.addThreadReference} />} />
        <NativeThreadReferenceChips references={references} disabled={!!pending || settled || busy || attachmentInput.saving} onRemove={ports.removeThreadReference} />
        <div className="flex flex-wrap items-center gap-1 border-t pt-2">
          {groupMembers ? <><ThreadGroupMembers members={groupMembers} writer={groupWriter} lead={groupLead} /><MemberThreadsToggle /></> : <ThreadBotPicker bots={bots} current={currentBot} selectedId={document.botId ?? null} disabled={!!conversationId || !!pending || busy}
            currentState={header && currentBot ? botConversationState(header, view?.items ?? NO_ITEMS, executionFailure) : "idle"}
            modelOverride={!!header && !!currentBot && isBotModelOverride(currentBot, header.conversation.provider)}
            onUseBotModel={canChangeModel && botModelSeed && !botModelRevert ? () => setBotModelRevert((value) => value + 1) : undefined}
            onSelect={ports.selectBot} onManage={ports.openBotSettings} />}
          <ThreadWorkspacePicker workspace={workspace} workspaces={ports.state.workspaces} disabled={!!conversationId || !!pending || busy || !!groupMembers} onSelect={ports.selectWorkspace} />
          <ThreadCheckoutPicker workspace={workspace} workspaces={ports.state.workspaces} disabled={!!conversationId || !!pending || busy || !!groupMembers} onSelect={ports.selectWorkspace} />
          <span className="ml-auto truncate px-2 text-xs text-muted-foreground" title={workspace.workspace.environmentId}>{workspace.workspace.environmentId}</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">{groupMembers ? null : <NativeProviderPicker key={`${workspace.id}:${document.botId ?? ""}:${threadProviderKey}:${botModelRevert}`} state={ports.state} workspace={workspace} client={client}
            allowChange={canChangeModel} startEditing={botModelRevert > 0}
            initial={botModelRevert && botModelSeed ? botModelSeed : document.provider ?? (draftBot ? botBindingSeed(draftBot.binding) : null)} locked={header?.conversation.provider ?? (conversationId ? document.provider : pending?.create?.provider) ?? null} onBinding={setBinding} onCapabilities={setCapabilities} />}</div>
          <ThreadContextUsage header={header ?? null} capabilities={capabilities} ready={!busy && !pending && !settled} compact={ports.compact} client={client} />
          <Button type={showStop ? "button" : "submit"} size={pending ? "sm" : "icon"} className="shrink-0 rounded-md" disabled={showStop ? busy || active?.state === "stopping" : !canSend}
            onClick={showStop && active ? () => void execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id }) : undefined}
            aria-label={actionLabel}>
            {showStop ? <Square className="size-3.5 fill-current" aria-hidden="true" /> : pending ? "Retry saved instruction" : <ArrowUp className="size-4" aria-hidden="true" />}</Button>
        </div>
      </form>
      </div>
    </div>
    </div>
  </section>;
}
