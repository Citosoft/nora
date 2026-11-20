import { memo } from "react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { ChatMessage } from "./ChatMessage";
import type { ChatTranscriptProps } from "@/components/app/types/chatPanels.types";

export const ChatTranscript = memo(function ChatTranscript({ entries, workThreads, onOpenThread, onBranch, onLinkClick }: ChatTranscriptProps) {
  return <div className="text-[15px]">{entries.map((entry) => {
    if (entry.kind === "message") return <ChatMessage key={entry.id} entry={entry}
      workThread={entry.workThreadId ? workThreads.get(entry.workThreadId) ?? null : null}
      onOpenThread={onOpenThread} onBranch={onBranch} onLinkClick={onLinkClick} />;
    const threadId = entry.workThreadId;
    const author = threadId ? workThreads.get(threadId)?.author : null;
    return <p key={entry.id} role="status" className="my-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      {author && <BotAvatar avatar={author.avatar} size={18} />}
      {threadId ? <button type="button" className="rounded hover:text-foreground focus-visible:outline focus-visible:outline-ring"
        onClick={() => onOpenThread(threadId)}>{entry.text}</button> : entry.text}
    </p>;
  })}</div>;
});
