import { ChatMessage } from "./ChatMessage";
import type { ChatTranscriptProps } from "@/components/app/types/chatPanels.types";

export function ChatTranscript({ entries, workThreads, onOpenThread, onLinkClick }: ChatTranscriptProps) {
  return <div className="text-[15px]">{entries.map((entry) => entry.kind === "notice"
    ? <p key={entry.id} role="status" className="my-3 text-center text-xs text-muted-foreground">{entry.text}</p>
    : <ChatMessage key={entry.id} entry={entry} workThread={entry.workThreadId ? workThreads.get(entry.workThreadId) ?? null : null}
      onOpenThread={onOpenThread} onLinkClick={onLinkClick} />)}</div>;
}
