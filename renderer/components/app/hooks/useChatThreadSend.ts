import { useState } from "react";
import { newBranchIds, sendBranchMessage } from "@/components/app/logic/chatBranchSend";
import { chatBranchClient } from "@/components/app/clients/chatBranchClient";
import { canForceEndThread } from "@/components/app/logic/threadStopControl";
import type { ChatThreadSend, ChatThreadSendInput } from "@/components/app/types/chatThreadDetail.types";

/** Sending to one of a chat's work threads (or starting a draft branch), with retry-safe identities, and stopping its turn. */
export function useChatThreadSend({ client, target, chatId, composer, onComposerChange, onStarted, reload, active }: ChatThreadSendInput): ChatThreadSend {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (): Promise<void> => {
    const text = composer.text.trim();
    const ids = composer.pending ?? newBranchIds();
    onComposerChange({ pending: ids });
    setSending(true); setError(null);
    try {
      const threadId = await sendBranchMessage({ conversations: client, branches: chatBranchClient }, target, chatId, text, ids);
      onComposerChange({ text: "", pending: null });
      if (target.kind === "draft") onStarted?.(threadId);
      reload();
    } catch (cause) {
      // The same identities are kept, so Retry repeats this message rather than sending a second one.
      setError(cause instanceof Error ? cause.message : "Delivery was not confirmed. Retry sends the same message.");
    } finally { setSending(false); }
  };
  const forceEnd = active ? canForceEndThread(active.state) : false;
  const stop = active ? {
    label: forceEnd ? "End turn" : "Stop",
    disabled: false,
    onStop: () => void client.execute({ kind: "interrupt", commandId: crypto.randomUUID(), conversationId: active.conversationId, runId: active.id })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The reply could not be stopped."))
  } : null;
  return { sending, error, send, stop };
}
