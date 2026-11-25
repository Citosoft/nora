import { TranscriptHistory } from "@/components/app/shared/TranscriptHistory";
import { useMemo, useRef } from "react";
import { ArrowDown, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useThreadLinks } from "@/components/app/hooks/useThreadLinks";
import { useTranscriptFollow } from "@/components/app/hooks/useTranscriptFollow";
import { buildBranchTimeline } from "@/components/app/logic/chatBranchTimeline";
import { useChatThreadSend } from "@/components/app/hooks/useChatThreadSend";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import { ChatTranscript } from "./ChatTranscript";
import { ChatTyping } from "./ChatTyping";
import { ChatRequests } from "./ChatRequests";
import { ChatComposer } from "./ChatComposer";
import { ChatBranchInfoPanel } from "./ChatBranchInfoPanel";
import type { ComposerEditorHandle } from "@/components/app/types/composerEditor.types";
import type { ChatBranchViewProps, ChatWorkThread } from "@/components/app/types/chatPanels.types";

const NO_THREADS: ReadonlyMap<string, ChatWorkThread> = new Map();

/**
 * A branch of a chat: one work thread read and written like the chat itself, so you can keep several conversations going with
 * a bot without each one carrying the others' context. A draft branch has no thread yet; its first message starts one.
 */
export function ChatBranchView({ target, bot, chatId, composer, onComposerChange, onStarted, onOpenThread, onLinkClick, mentions, chatWorkspaceName }: ChatBranchViewProps) {
  const { client, workspace } = useNativeConversationPorts();
  const thread = target.kind === "thread" ? target.thread : null;
  const conversationId = thread?.id ?? (target.kind === "draft" ? target.draft.threadId : null);
  const { view, error: loadError, older, reload } = useNativeConversation({ client, conversationId });
  const author = useMemo(() => ({ kind: "bot" as const, botId: bot.botId, name: bot.name, avatar: bot.avatar }), [bot]);
  const entries = useMemo(() => buildBranchTimeline(view?.items ?? [], author), [view?.items, author]);
  const transcript = useTranscriptFollow(view?.items);
  const threadLinks = useThreadLinks(workspace.workspace.path);
  const input = useRef<ComposerEditorHandle>(null);
  const active = view?.header.activeRuns[0];
  const { sending, error, send, stop } = useChatThreadSend({ client, target, chatId, composer, onComposerChange, onStarted, reload, active });
  const starting = target.kind === "draft" && !!target.draft.threadId;
  const settled = !!thread?.settled;
  const busy = sending || starting;
  const canSend = !busy && !settled && (!!composer.pending || !!composer.text.trim());
  const working = !!active || !!thread?.working || starting;
  const waiting = !!thread?.waiting;
  return <div className="flex min-h-0 flex-1">
    <div className="flex min-w-0 flex-1 flex-col">
    <TranscriptHistory scrollRef={transcript.ref} onNavigate={transcript.pauseFollowing}>
    <div ref={transcript.ref} onWheel={transcript.onWheel} onScroll={transcript.onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-10 pr-5 pb-6">
      <div className="mx-auto max-w-[760px]">
        {/* The info panel carries this on wider windows. */}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
          <span className="min-w-0 flex-1 truncate">{thread ? `${thread.branch ? "Branch" : "Task"}${thread.workspaceName ? ` · ${thread.workspaceName}` : ""}` : `New branch with ${bot.name}`}</span>
          {thread && <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onOpenThread(thread.id)}>
            <SquareArrowOutUpRight className="size-3" aria-hidden="true" />Open thread</Button>}
        </div>
        {target.kind === "draft" && !entries.length && <div className="flex flex-col items-center gap-3 py-10 text-center">
          <SpeakerAvatar botId={bot.botId} avatar={bot.avatar} size={64} />
          <p className="max-w-md text-sm text-muted-foreground">A side chat with {bot.name}. {target.draft.from ? "It knows the chat up to the message you branched from, and nothing said here goes back to the main chat." : "It starts fresh, apart from your main chat."}</p>
          {target.draft.from && <blockquote className="max-w-md truncate border-l-2 pl-3 text-left text-sm text-muted-foreground md:hidden">{target.draft.from.excerpt}</blockquote>}
        </div>}
        {loadError && <div role="alert" className="mt-4"><p>{loadError}</p><Button onClick={reload}>Reload branch</Button></div>}
        {view?.nextBefore && <div className="mt-4 flex justify-center"><Button variant="ghost" size="sm" onClick={() => void older()}>Load earlier messages</Button></div>}
        {conversationId && !view && !loadError && <p className="mt-4 text-muted-foreground">Loading…</p>}
        <ChatTranscript entries={entries} workThreads={NO_THREADS} onOpenThread={onOpenThread} onLinkClick={onLinkClick ?? threadLinks} mentions={mentions} />
        {chatId && conversationId && <ChatRequests conversationId={chatId} threadId={conversationId} />}
        {working && <ChatTyping botId={bot.botId} name={bot.name} avatar={bot.avatar} workspaceName={thread?.workspaceName ?? null} waiting={waiting} />}
      </div>
    </div>
    </TranscriptHistory>
    {transcript.newActivity && <Button variant="secondary" size="sm" className="mx-auto mb-3 rounded-full" onClick={transcript.jumpToLatest}>
      <ArrowDown className="size-3.5" aria-hidden="true" />Jump to latest</Button>}
    <div className="mx-auto w-full max-w-[808px] space-y-2 px-4 pb-5 sm:px-6">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ChatComposer inputRef={input} value={composer.text} disabled={busy || settled} canSend={canSend}
        placeholder={settled ? "This thread is settled" : `Message ${bot.name} in this ${thread && !thread.branch ? "task" : "branch"}`}
        sendLabel={composer.pending ? "Retry message" : active ? "Queue message" : "Send message"} stop={stop}
        onChange={(text) => onComposerChange({ text })} onSubmit={() => { if (canSend) { transcript.jumpToLatest(); void send(); } }} />
    </div>
    </div>
    <ChatBranchInfoPanel target={target} bot={bot} model={view?.header.conversation.provider.model ?? null} chatWorkspaceName={chatWorkspaceName} onOpenThread={onOpenThread} />
  </div>;
}
