import type { AiChatTranscriptProps } from "@/components/app/types/aiChatPanelLayout.types";
import { LoaderCircle } from "lucide-react";
import { AiChatTranscriptMessage } from "./AiChatTranscriptMessage";

export const AiChatTranscript = ({
  transcriptRef,
  chatMessages,
  showWaitingIndicator,
  error
}: AiChatTranscriptProps) => {
  return (
    <div ref={transcriptRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {chatMessages.length === 0 && !error ? (
        <div className="text-sm text-muted-foreground">
          Ask anything about your project. This chat uses your configured BYOK model.
        </div>
      ) : null}
      {chatMessages.map((message) => (
        <AiChatTranscriptMessage key={message.id} message={message} />
      ))}
      {showWaitingIndicator ? (
        <div
          className="flex max-w-[82%] items-center gap-2 rounded-2xl bg-transparent px-3 py-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
          aria-label="Waiting for assistant response"
        >
          <LoaderCircle className="size-4 animate-spin" />
          <span>Thinking…</span>
        </div>
      ) : null}
      {error ? (
        <div
          className="max-w-[82%] rounded-2xl border border-destructive/45 bg-destructive/8 px-3 py-2 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive/90">Request failed</div>
          <div className="whitespace-pre-wrap leading-6">{error.message}</div>
        </div>
      ) : null}
    </div>
  );
};
