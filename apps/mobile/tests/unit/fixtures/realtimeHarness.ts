import { realtimeClientMessageSchema } from "@shared/remote-access/runtimeApi";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationEventPage } from "@shared/types/conversation/queries.types";
import type { RealtimeClientMessage, RealtimeServerMessage } from "@shared/types/remote-access/runtimeApi.types";
import { createRealtimeConnection } from "@/realtime/realtimeConnection";
import type { RealtimeConnection, RealtimeSocketHandlers, RealtimeStatus } from "@/types/realtime.types";

export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

export class FakeSocket {
  readonly sent: RealtimeClientMessage[] = [];
  closedByClient: number | null = null;
  /** Answers pings like a healthy runtime; switch off to simulate a socket that died silently. */
  autoPong = true;
  constructor(readonly url: string, private readonly handlers: RealtimeSocketHandlers) {}
  send(data: string): void {
    const message = realtimeClientMessageSchema.parse(JSON.parse(data));
    this.sent.push(message);
    if (message.type === "ping" && this.autoPong) this.receive({ type: "pong" });
  }
  close(code?: number): void {
    this.closedByClient = code ?? 1000;
  }
  open(): void {
    this.handlers.onOpen();
  }
  receive(message: RealtimeServerMessage): void {
    this.handlers.onMessage(JSON.stringify(message));
  }
  closeFromServer(code: number): void {
    this.handlers.onClose(code, "");
  }
}

interface Timer { at: number; callback: () => void; cancelled: boolean }

/** Deterministic clock, timers, sockets, tickets and event pages for driving a realtime connection. */
export function realtimeHarness(options: { pages?: (ConversationEventPage | Error)[]; random?: number } = {}) {
  let now = 1_000_000;
  const timers: Timer[] = [];
  const sockets: FakeSocket[] = [];
  const delivered: ConversationEvent[] = [];
  const statuses: RealtimeStatus[] = [];
  const pageRequests: number[] = [];
  const pages = [...(options.pages ?? [])];
  let tickets = 0;
  let resets = 0;

  const connection: RealtimeConnection = createRealtimeConnection({
    requestTicket: async () => ({ ticket: `ticket-${String(++tickets).padStart(40, "0")}`, expiresAt: new Date(now + 30_000).toISOString() }),
    fetchEvents: async (after) => {
      pageRequests.push(after);
      const page = pages.shift() ?? { schemaVersion: 1, after, nextCursor: after, events: [] };
      if (page instanceof Error) throw page;
      return page;
    },
    socketUrl: (ticket) => `wss://abc123.remote.withnora.run/v1/realtime?ticket=${ticket}`,
    createSocket: (url, handlers) => {
      const socket = new FakeSocket(url, handlers);
      sockets.push(socket);
      return socket;
    },
    schedule: (callback, delayMs) => {
      const timer: Timer = { at: now + delayMs, callback, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    now: () => now,
    random: () => options.random ?? 0.5
  }, {
    onEvents: (events) => delivered.push(...events),
    onStatus: (status) => statuses.push(status),
    onReset: async () => {
      resets += 1;
      return 500;
    }
  });

  return {
    connection, sockets, delivered, statuses, pageRequests,
    get tickets() { return tickets; },
    get resets() { return resets; },
    get now() { return now; },
    latestSocket(): FakeSocket {
      const socket = sockets.at(-1);
      if (!socket) throw new Error("no socket opened");
      return socket;
    },
    /** Moves the clock forward, firing due timers in order and letting their async work settle. */
    async advance(ms: number): Promise<void> {
      const target = now + ms;
      for (;;) {
        const due = timers.filter((timer) => !timer.cancelled && timer.at <= target).sort((left, right) => left.at - right.at)[0];
        if (!due) break;
        now = due.at;
        due.cancelled = true;
        due.callback();
        await flush();
      }
      now = target;
      await flush();
    },
    pendingTimerDelays(): number[] {
      return timers.filter((timer) => !timer.cancelled).map((timer) => timer.at - now);
    }
  };
}
