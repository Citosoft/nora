import type { Conversation, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";

export interface AttentionSource { conversationId: string; /** Changes whenever the thread's waiting requests may have changed. */ revision: string; }
export interface AttentionToast { request: RuntimeRequest; conversation: Conversation; notice: AttentionNotice; }
/** A question simple enough to answer from a toast: one question, one choice, a few options. */
export interface InlineQuestion { questionId: string; text: string; options: readonly string[]; }
export interface AttentionToastsState {
  toasts: readonly AttentionToast[];
  respond(toast: AttentionToast, response: RequestResponse): Promise<void>;
  open(toast: AttentionToast): void;
  dismiss(toast: AttentionToast): void;
}
export interface AttentionTrayRowProps { toast: AttentionToast; onRespond(response: RequestResponse): Promise<void>; onOpen(): void; onDismiss(): void; }
