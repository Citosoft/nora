import type { ReactNode } from "react";
import type { Conversation, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";

export interface AttentionToast { request: RuntimeRequest; conversation: Conversation; notice: AttentionNotice; }
/** A question simple enough to answer from a toast: one question, one choice, a few options. */
export interface InlineQuestion { questionId: string; text: string; options: readonly string[]; }
export interface AttentionToastsState {
  toasts: readonly AttentionToast[];
  respond(toast: AttentionToast, response: RequestResponse): Promise<void>;
  open(toast: AttentionToast): void;
  dismiss(toast: AttentionToast): void;
}
export interface AttentionTrayRowProps {
  toast: AttentionToast;
  onRespond(response: RequestResponse): Promise<void>;
  onOpen(): void;
  /** Hides the row here while the request keeps waiting; omitted where hiding makes no sense, such as the inbox. */
  onDismiss?(): void;
  /** Further actions for the row's menu, such as the inbox's snooze choices. */
  menuItems?: ReactNode;
}
