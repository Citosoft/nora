import type { InboxService } from "@main/types/inbox/inbox.types";
import type { PushNotification } from "@shared/types/remote-access/push.types";

export type PhonePushOutcome = { kind: "sent"; delivered: number } | { kind: "skipped" };

export interface PhonePushNotifierDeps {
  inbox: Pick<InboxService, "snapshot" | "subscribe">;
  now(): string;
  /** The user's "Notify my phone" setting; read when items arrive. */
  enabled(): boolean;
  /** Sends one batch of at most `PUSH_LIMITS.maxNotificationsPerRequest`; may reject. */
  send(notifications: readonly PushNotification[]): Promise<PhonePushOutcome>;
  setTimeout(callback: () => void, delayMs: number): { cancel(): void };
  /** How long to gather items that arrive together before sending. */
  batchDelayMs?: number;
  /** Reports a failed send; must not throw. */
  onError?(error: unknown): void;
}
