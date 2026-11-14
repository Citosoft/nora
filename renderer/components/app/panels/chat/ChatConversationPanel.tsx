import { useEffect, useMemo, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIRECT_BINDING, GROUP_BINDING } from "@shared/bots/chats";
import { effectiveBots, findEffectiveBot } from "@shared/bots/catalog";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useThreadLinks } from "@/components/app/hooks/useThreadLinks";
import { useTranscriptFollow } from "@/components/app/hooks/useTranscriptFollow";
import { buildChatTimeline } from "@/components/app/logic/chatTimeline";
import { chatParticipants } from "@/components/app/logic/chatParticipants";
import { executionFailureMessage } from "@/components/app/logic/executionFailureMessage";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { NativeQueue } from "@/components/app/panels/conversations/NativeQueue";
import { ChatHeader } from "./ChatHeader";
import { ChatGreeting } from "./ChatGreeting";
import { ChatTranscript } from "./ChatTranscript";
import { ChatTyping } from "./ChatTyping";
import { ChatRequests } from "./ChatRequests";
import { ChatComposer } from "./ChatComposer";
import { ChatWorkspacePicker } from "./ChatWorkspacePicker";
import type { ComposerEditorHandle } from "@/components/app/types/composerEditor.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";

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
  const participants = chatParticipants(header?.conversation ?? null, document, bots);
  const binding = participants?.kind === "group" ? GROUP_BINDING : DIRECT_BINDING;
  // Chats run on Nora's coordinators; the bots answer with their own models, so the send-ready binding is fixed.
  useEffect(() => { setBinding(binding, "inherited"); }, [binding, setBinding]);
  const entries = useMemo(() => buildChatTimeline(view?.items ?? []), [view?.items]);
  const workThreads = useMemo(() => new Map(ports.workThreads.map((thread) => [thread.id, thread])), [ports.workThreads]);
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
  const stoppable = !!active && active.state !== "recovering" && !pending && !document.text.trim();
  const mentions = useMemo(() => participants?.kind === "group" ? participants.members.map((member) => ({ id: member.botId, name: member.name,
    detail: member.role || undefined, icon: <BotAvatar avatar={member.avatar} size={20} /> })) : undefined, [participants]);
  const direct = participants?.kind === "direct" ? participants.bot : null;
  const chatWorkspaces = useMemo(() => direct ? ports.state.workspaces.filter((entry) => entry.workspace.environmentId === ports.state.environmentId
    && !!findEffectiveBot(ports.state.personalization.bots, entry.id, ports.state.sharedBots, direct.botId)) : [],
  [direct, ports.state.workspaces, ports.state.environmentId, ports.state.personalization.bots, ports.state.sharedBots]);
  const savedDirect = header?.conversation.direct;
  const footer = direct ? <ChatWorkspacePicker workspaces={chatWorkspaces} selectedId={savedDirect?.workspaceId ?? workspace.id}
    fixed={!savedDirect || savedDirect.scope.kind === "workspace"} disabled={busy || settled}
    onSelect={(workspaceId) => { if (header) void execute({ kind: "set-direct-workspace", commandId: crypto.randomUUID(), conversationId: header.conversation.id, workspaceId }); }} /> : undefined;
  const error = runtime.error ?? ports.storageError ?? (executionFailure ? executionFailureMessage(executionFailure) : pending ? "Delivery is unconfirmed. Retry sends the same saved message." : null);
  if (!participants) return <section className="p-6 text-sm text-muted-foreground" role="status">This chat's bots are no longer available in this workspace.</section>;
  const name = participants.kind === "direct" ? participants.bot.name : "the group";
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={participants.kind === "direct" ? `Chat with ${participants.bot.name}` : "Group chat"}>
    <ChatHeader participants={participants} state={avatarState} />
    <div ref={transcript.ref} onWheel={transcript.onWheel} onScroll={transcript.onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
      <div className="mx-auto max-w-[760px]">
        {loadError && <div role="alert" className="mt-4"><p>{loadError}</p><Button onClick={reload}>Reload chat</Button></div>}
        {view?.nextBefore && <div className="mt-4 flex justify-center"><Button variant="ghost" size="sm" onClick={() => void older()}>Load earlier messages</Button></div>}
        {conversationId && !view && !loadError && <p className="mt-4 text-muted-foreground">Loading chat…</p>}
        {!entries.length && !conversationId && <ChatGreeting participants={participants} />}
        <ChatTranscript entries={entries} workThreads={workThreads} onOpenThread={ports.openThread} onLinkClick={onLinkClick} />
        {header && <ChatRequests conversationId={header.conversation.id} />}
        {active && speaker && <ChatTyping name={speaker.name} avatar={speaker.avatar} workspaceName={current?.workspaceName ?? null} waiting={!!current?.waiting} />}
      </div>
    </div>
    {transcript.newActivity && <Button variant="secondary" size="sm" className="mx-auto mb-3 rounded-full" onClick={transcript.jumpToLatest}>
      <ArrowDown className="size-3.5" aria-hidden="true" />Jump to latest</Button>}
    <div className="mx-auto w-full max-w-[808px] space-y-2 px-4 pb-5 sm:px-6">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {active?.state === "recovering" && <Button type="button" size="sm" variant="outline" disabled={busy}
        onClick={() => void execute({ kind: "reconcile", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })}>Check status</Button>}
      {header && <NativeQueue conversationId={header.conversation.id} runs={header.queuedRuns} paused={header.conversation.queuePaused} busy={busy} execute={execute} />}
      <ChatComposer inputRef={composer} value={text} disabled={!!pending || settled} canSend={canSend} mentions={mentions} footer={footer}
        placeholder={settled ? "Reopen this chat to continue" : `Message ${name}`}
        sendLabel={pending ? "Retry saved message" : active ? "Queue message" : "Send message"}
        stop={stoppable && active ? { label: active.state === "stopping" ? "Stopping" : "Stop", disabled: busy || active.state === "stopping",
          onStop: () => void execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id }) } : null}
        onChange={setText} onSubmit={() => void submit()} />
    </div>
  </section>;
}
