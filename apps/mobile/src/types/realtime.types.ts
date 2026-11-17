import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationEventPage } from "@shared/types/conversation/queries.types";
import type { RealtimeTicketResponse } from "@shared/types/remote-access/runtimeApi.types";

/** Connection state as the UI shows it. */
export type RealtimeStatus =
  | { kind: "idle" }
  | { kind: "connecting"; attempt: number }
  | { kind: "live" }
  | { kind: "catching-up" }
  /** Disconnected; the next attempt is scheduled for `retryAt` (epoch ms). */
  | { kind: "waiting"; attempt: number; retryAt: number; reason: string }
  /** Stopped for good until restarted: the runtime refused this account or the session, or the client stopped it. */
  | { kind: "stopped"; reason: "forbidden" | "signed-out" | "stopped"; message: string };

export interface RealtimeSocketHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onClose(code: number, reason: string): void;
  onError(): void;
}

export interface RealtimeSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type RealtimeSocketFactory = (url: string, handlers: RealtimeSocketHandlers) => RealtimeSocket;

/** Schedules a callback and returns its cancel function. */
export type ScheduleTimer = (callback: () => void, delayMs: number) => () => void;

export interface RealtimeOptions {
  backoffBaseMs: number;
  backoffMaxMs: number;
  /** Refresh socket auth this long before the runtime's `authExpiresAt`. */
  authRefreshMarginMs: number;
  heartbeatIntervalMs: number;
  /** A socket that has been silent this long (no message, not even `pong`) is treated as dead. */
  silenceTimeoutMs: number;
  eventPageLimit: number;
}

export interface RealtimeDeps {
  requestTicket(): Promise<RealtimeTicketResponse>;
  fetchEvents(after: number, limit: number): Promise<ConversationEventPage>;
  socketUrl(ticket: string): string;
  createSocket: RealtimeSocketFactory;
  schedule: ScheduleTimer;
  now(): number;
  /** Uniform in [0, 1); used for backoff jitter. */
  random(): number;
  options?: Partial<RealtimeOptions>;
}

export interface RealtimeListener {
  /** Events in cursor order, each delivered once. */
  onEvents(events: readonly ConversationEvent[]): void;
  onStatus(status: RealtimeStatus): void;
  /**
   * The runtime no longer has the events after our cursor (`cursor-unavailable`). The listener reloads its state from
   * fresh snapshots and returns the cursor those snapshots are current to.
   */
  onReset(): Promise<number>;
}

export interface RealtimeConnection {
  start(after: number): void;
  stop(): void;
  /** Reconnect now if waiting (app foregrounded, browser back online); otherwise check the socket is alive. */
  resume(): void;
  status(): RealtimeStatus;
  cursor(): number;
}
