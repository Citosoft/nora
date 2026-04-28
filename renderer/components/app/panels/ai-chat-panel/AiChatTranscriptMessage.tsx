import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { AiChatTranscriptMessageProps } from "@/components/app/types/aiChatTranscriptMessage.types";
import { getAiChatMessageText } from "@/components/app/logic/aiChatMessageText";
import { getAiChatToolActivityEntries } from "@/components/app/logic/aiChatToolActivity";
import { AiChatToolActivityGroup } from "./AiChatToolActivityGroup";

export const AiChatTranscriptMessage = ({ message }: AiChatTranscriptMessageProps) => {
  const toolEntries = message.role === "assistant" ? getAiChatToolActivityEntries(message) : [];

  return (
    <div
      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
        message.role === "user"
          ? "chat-pane-message-bubble ml-auto bg-muted/55 text-foreground"
          : "text-foreground"
      }`}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {message.role === "user" ? "You" : "Assistant"}
      </div>
      {message.role === "assistant" ? (
        <MarkdownRenderer className="space-y-3 text-sm leading-6 text-foreground">{getAiChatMessageText(message)}</MarkdownRenderer>
      ) : (
        <div className="whitespace-pre-wrap leading-6">{getAiChatMessageText(message)}</div>
      )}
      {message.role === "assistant" ? <AiChatToolActivityGroup messageId={message.id} entries={toolEntries} /> : null}
    </div>
  );
};
