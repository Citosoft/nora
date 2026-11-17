import type { StatusTone } from "./conversationState.types";

export interface ConnectionNotice {
  tone: StatusTone;
  title: string;
  message: string | null;
  /** `retry` reloads runtime info and reconnects; `reconnect` skips the backoff wait. */
  action: "retry" | "reconnect" | null;
}
