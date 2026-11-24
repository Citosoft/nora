import { useMemo, useRef, useState } from "react";
import { ArrowLeft, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { useTranscriptFollow } from "@/components/app/hooks/useTranscriptFollow";
import { useChatThreadSend } from "@/components/app/hooks/useChatThreadSend";
import { buildChatThreadSummaries } from "@/components/app/logic/chatThreadSummaries";
import { chatThreadStatus, formatChatMoment } from "@/components/app/logic/chatBranchInfo";
import { ChatThreadTimeline } from "./ChatThreadTimeline";
import { ChatThreadReplyCard } from "./ChatThreadReplyCard";
import { ChatRequests } from "./ChatRequests";
import { ChatComposer } from "./ChatComposer";
import { ChatSectionLabel } from "./ChatSectionLabel";
import type { ComposerEditorHandle } from "@/components/app/types/composerEditor.types";
import type { ChatBranchComposerState, ChatBranchTarget } from "@/components/app/types/chatPanels.types";
import type { ChatThreadDetailProps, ChatThreadStatus } from "@/components/app/types/chatThreadDetail.types";

const TONE_DOTS: Record<ChatThreadStatus["tone"], string> = {
  waiting: "bg-orange-500", working: "bg-amber-500 motion-safe:animate-pulse", ready: "bg-green-600 dark:bg-green-500", settled: "bg-muted-foreground"
};

/**
 * A work thread opened in the chat sidebar, under the bot's header: what it is and where it stands, a timeline of its turns (whose first
 * step is the brief), its latest reply with anything waiting on the user, and a composer to give it more input.
 */
export function ChatThreadDetail({ thread, bot, botInHeader, chatId, onBack, onOpenFull }: ChatThreadDetailProps) {
  const { client } = useNativeConversationPorts();
  const { view, error: loadError, older, reload } = useNativeConversation({ client, conversationId: thread.id });
  const turns = useMemo(() => view ? buildChatThreadSummaries([...view.runHistory.runs, ...view.header.activeRuns], view.items) : [], [view]);
  const transcript = useTranscriptFollow(view?.items);
  const input = useRef<ComposerEditorHandle>(null);
  const [composer, setComposer] = useState<ChatBranchComposerState>({ text: "", pending: null });
  const target = useMemo<ChatBranchTarget>(() => ({ kind: "thread", thread }), [thread]);
  const active = view?.header.activeRuns[0];
  const { sending, error, send, stop } = useChatThreadSend({ client, target, chatId, composer, active, reload,
    onComposerChange: (patch) => setComposer((current) => ({ ...current, ...patch })) });
  const canSend = !sending && !thread.settled && (!!composer.pending || !!composer.text.trim());
  const status = chatThreadStatus(thread);
  const featured = turns.filter((turn) => turn.reply).at(-1) ?? null;
  const requests = chatId ? <ChatRequests conversationId={chatId} threadId={thread.id} /> : null;
  const details = [["Done means", view?.header.conversation.done], ["Workspace", thread.workspaceName], ["Model", thread.model]] as const;
  return <section aria-label={`${thread.title} details`} className="flex min-h-0 flex-1 flex-col">
    <nav aria-label="Thread" className="flex shrink-0 items-center justify-between px-2.5 pt-2">
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden="true" />All work</Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => onOpenFull(thread.id)}>
        Open thread<SquareArrowOutUpRight className="size-3.5" aria-hidden="true" /></Button>
    </nav>
    <div ref={transcript.ref} onWheel={transcript.onWheel} onScroll={transcript.onScroll} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <header className="space-y-1.5 border-b px-4 pb-4 pt-2">
        <h2 className="break-words text-base font-semibold leading-snug">{thread.title}</h2>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground"><span aria-hidden="true" className={`size-2 rounded-full ${TONE_DOTS[status.tone]}`} />{status.label}</span>
          {!botInHeader && <span className="flex items-center gap-1"><SpeakerAvatar botId={bot.botId} avatar={bot.avatar} size={14} />{bot.name}</span>}
          <span>{thread.branch ? "Branch" : "Task"} · Started {formatChatMoment(thread.createdAt)}</span>
        </p>
      </header>
      <div className="space-y-6 px-4 py-4">
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
          {details.map(([label, value]) => value ? <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt>
            <dd className={label === "Done means" ? "line-clamp-3 break-words" : "truncate"} title={value}>{value}</dd></div> : null)}
        </dl>
        <section aria-label="Activity" className="space-y-3">
          <ChatSectionLabel>Activity</ChatSectionLabel>
          {loadError && <div role="alert" className="space-y-2 text-xs"><p className="text-destructive">{loadError}</p><Button size="sm" onClick={reload}>Reload thread</Button></div>}
          {!view && !loadError && <p role="status" className="text-xs text-muted-foreground">Loading thread…</p>}
          {view?.nextBefore && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void older()}>Load earlier turns</Button>}
          {view && !turns.length && <p className="text-xs text-muted-foreground">Nothing has happened in this thread yet.</p>}
          <ChatThreadTimeline turns={turns} botName={bot.name} featuredRunId={featured?.runId ?? null} />
        </section>
        {featured?.reply ? <ChatThreadReplyCard bot={bot} reply={featured.reply}>{requests}</ChatThreadReplyCard> : requests}
      </div>
    </div>
    <div className="space-y-2 border-t px-4 py-3">
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <ChatComposer inputRef={input} value={composer.text} disabled={sending || thread.settled} canSend={canSend} stop={stop}
        placeholder={thread.settled ? "This thread is settled" : `More input for ${bot.name} on this ${thread.branch ? "branch" : "task"}`}
        sendLabel={composer.pending ? "Retry message" : active ? "Queue message" : "Send message"}
        onChange={(text) => setComposer((current) => ({ ...current, text }))} onSubmit={() => void send()} />
    </div>
  </section>;
}
