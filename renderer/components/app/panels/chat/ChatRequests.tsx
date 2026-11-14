import { useChatRequests } from "@/components/app/hooks/useChatRequests";
import { AttentionTrayRow } from "@/components/app/panels/threads/AttentionTrayRow";
import type { ChatRequestsProps } from "@/components/app/types/chatPanels.types";

/** Approvals and questions from the chat's work threads, answered right in the chat. */
export function ChatRequests({ conversationId }: ChatRequestsProps) {
  const { toasts, respond, open, dismiss } = useChatRequests(conversationId);
  if (!toasts.length) return null;
  return <ul aria-label="Waiting for you" className="mt-4 divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
    {toasts.map((toast) => <AttentionTrayRow key={toast.request.id} toast={toast}
      onRespond={(response) => respond(toast, response)} onOpen={() => open(toast)} onDismiss={() => dismiss(toast)} />)}
  </ul>;
}
