import { REALTIME_CLOSE_CODES, REMOTE_LIMITS } from "@shared/remote-access/constants";
import { realtimeServerMessageSchema } from "@shared/remote-access/runtimeApi";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { RealtimeClientMessage, RealtimeServerMessage } from "@shared/types/remote-access/runtimeApi.types";
import type { RealtimeConnection, RealtimeDeps, RealtimeListener, RealtimeOptions, RealtimeSocket, RealtimeStatus } from "@/types/realtime.types";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { backoffDelay } from "./backoff";

const defaultOptions: RealtimeOptions = {
  backoffBaseMs: 1_000,
  backoffMaxMs: 30_000,
  authRefreshMarginMs: 60_000,
  heartbeatIntervalMs: 25_000,
  silenceTimeoutMs: 60_000,
  eventPageLimit: REMOTE_LIMITS.eventPageLimit
};
const authRetryDelayMs = 5_000;
/** Close code the client uses when it drops a socket on purpose (reconnect, stop). */
const clientCloseCode = 4000;

/**
 * Keeps one realtime subscription to a runtime alive: ticket → socket → `subscribe {after}`, auth refresh before the
 * deadline, heartbeat, reconnect with capped backoff, and HTTP catch-up after `resync` or a reconnect. Events reach the
 * listener exactly once and in cursor order; anything at or below the last delivered cursor is dropped.
 */
export function createRealtimeConnection(deps: RealtimeDeps, listener: RealtimeListener): RealtimeConnection {
  const options: RealtimeOptions = { ...defaultOptions, ...deps.options };
  let status: RealtimeStatus = { kind: "idle" };
  let lastCursor = 0;
  let running = false;
  /** Bumped for every socket and on stop; callbacks from an older generation are ignored. */
  let generation = 0;
  let socket: RealtimeSocket | null = null;
  let attempt = 0;
  let lastMessageAt = 0;
  let catchingUp = false;
  let buffered: ConversationEvent[] = [];
  let cancelRetry: (() => void) | null = null;
  let cancelAuthRefresh: (() => void) | null = null;
  let cancelHeartbeat: (() => void) | null = null;

  const setStatus = (next: RealtimeStatus): void => {
    status = next;
    listener.onStatus(next);
  };

  const deliver = (events: readonly ConversationEvent[]): void => {
    const fresh: ConversationEvent[] = [];
    for (const event of [...events].sort((left, right) => left.cursor - right.cursor)) {
      if (event.cursor <= lastCursor) continue;
      fresh.push(event);
      lastCursor = event.cursor;
    }
    if (fresh.length) listener.onEvents(fresh);
  };

  const send = (message: RealtimeClientMessage): void => {
    try {
      socket?.send(JSON.stringify(message));
    } catch {
      // A socket that cannot send is about to close; its close handler reconnects.
    }
  };

  const clearConnectionTimers = (): void => {
    cancelAuthRefresh?.();
    cancelHeartbeat?.();
    cancelAuthRefresh = null;
    cancelHeartbeat = null;
  };

  /** Detaches and closes the current socket without triggering its close handler. */
  const dropSocket = (): void => {
    generation += 1;
    clearConnectionTimers();
    catchingUp = false;
    buffered = [];
    const current = socket;
    socket = null;
    try {
      current?.close(clientCloseCode, "client reconnect");
    } catch {
      // Already closed.
    }
  };

  const scheduleReconnect = (reason: string): void => {
    if (!running) return;
    cancelRetry?.();
    const delay = backoffDelay(attempt, options.backoffBaseMs, options.backoffMaxMs, deps.random);
    attempt += 1;
    setStatus({ kind: "waiting", attempt, retryAt: deps.now() + delay, reason });
    cancelRetry = deps.schedule(() => {
      cancelRetry = null;
      void connect();
    }, delay);
  };

  const stopWith = (reason: "forbidden" | "signed-out" | "stopped", message: string): void => {
    running = false;
    cancelRetry?.();
    cancelRetry = null;
    dropSocket();
    setStatus({ kind: "stopped", reason, message });
  };

  const scheduleAuthRefresh = (gen: number, authExpiresAt: string): void => {
    cancelAuthRefresh?.();
    const remaining = Date.parse(authExpiresAt) - deps.now();
    const delay = Math.max(0, remaining - Math.min(options.authRefreshMarginMs, remaining / 2));
    cancelAuthRefresh = deps.schedule(() => void refreshAuth(gen, authExpiresAt), delay);
  };

  const refreshAuth = async (gen: number, authExpiresAt: string): Promise<void> => {
    try {
      const ticket = await deps.requestTicket();
      if (gen === generation) send({ type: "auth", ticket: ticket.ticket });
    } catch {
      // Retry while the deadline has not passed; after it the runtime closes with `authExpired` and we reconnect.
      if (gen === generation && Date.parse(authExpiresAt) > deps.now()) {
        cancelAuthRefresh = deps.schedule(() => void refreshAuth(gen, authExpiresAt), authRetryDelayMs);
      }
    }
  };

  const heartbeat = (gen: number): void => {
    cancelHeartbeat = deps.schedule(() => {
      if (gen !== generation) return;
      if (deps.now() - lastMessageAt > options.silenceTimeoutMs) {
        dropSocket();
        scheduleReconnect("The connection went quiet");
        return;
      }
      send({ type: "ping" });
      heartbeat(gen);
    }, options.heartbeatIntervalMs);
  };

  const catchUp = async (gen: number, from: number, resubscribe: boolean): Promise<void> => {
    catchingUp = true;
    setStatus({ kind: "catching-up" });
    try {
      let after = from;
      for (;;) {
        const page = await deps.fetchEvents(after, options.eventPageLimit);
        if (gen !== generation) return;
        deliver(page.events);
        if (page.events.length === 0 || page.nextCursor <= after) break;
        after = page.nextCursor;
      }
    } catch (error) {
      if (gen !== generation) return;
      if (!(error instanceof RemoteRequestError && error.code === "cursor-unavailable")) {
        dropSocket();
        scheduleReconnect("Couldn't catch up on missed updates");
        return;
      }
      try {
        const cursor = await listener.onReset();
        if (gen !== generation) return;
        lastCursor = Math.max(lastCursor, cursor);
      } catch {
        if (gen !== generation) return;
        dropSocket();
        scheduleReconnect("Couldn't reload the latest state");
        return;
      }
    }
    catchingUp = false;
    const pending = buffered;
    buffered = [];
    deliver(pending);
    if (resubscribe) send({ type: "subscribe", after: lastCursor });
    setStatus({ kind: "live" });
  };

  const handleMessage = (gen: number, message: RealtimeServerMessage): void => {
    switch (message.type) {
      case "ready":
        attempt = 0;
        scheduleAuthRefresh(gen, message.authExpiresAt);
        // Anything newer than our cursor may have been missed while disconnected: fetch it over HTTP. Events the
        // runtime also streams are deduplicated by cursor.
        if (catchingUp) return;
        if (message.cursor > lastCursor) void catchUp(gen, lastCursor, false);
        else setStatus({ kind: "live" });
        return;
      case "authenticated":
        scheduleAuthRefresh(gen, message.authExpiresAt);
        return;
      case "event":
        if (catchingUp) buffered.push(message.event);
        else deliver([message.event]);
        return;
      case "resync":
        if (!catchingUp) void catchUp(gen, Math.min(lastCursor, message.cursor), true);
        return;
      case "pong":
        return;
      case "error":
        if (message.code === "forbidden") stopWith("forbidden", "This computer refused the connection for this account.");
        else if (message.code === "unauthenticated") reconnectNow();
        return;
    }
  };

  const handleClose = (code: number): void => {
    socket = null;
    generation += 1;
    clearConnectionTimers();
    catchingUp = false;
    buffered = [];
    if (code === REALTIME_CLOSE_CODES.forbidden) {
      stopWith("forbidden", "This computer refused the connection for this account.");
    } else if (code === REALTIME_CLOSE_CODES.authExpired) {
      // The socket's auth lapsed: get a fresh ticket right away rather than backing off.
      void connect();
    } else if (code === REALTIME_CLOSE_CODES.unavailable) {
      scheduleReconnect("Remote access is paused on this computer");
    } else if (code === REALTIME_CLOSE_CODES.overloaded) {
      scheduleReconnect("Your computer has too many open connections");
    } else {
      scheduleReconnect("Connection lost");
    }
  };

  const handleConnectError = (error: unknown): void => {
    if (error instanceof RemoteRequestError) {
      if (error.failure.kind === "signed-out") return stopWith("signed-out", error.message);
      if (error.code === "forbidden") return stopWith("forbidden", error.message);
      return scheduleReconnect(error.message);
    }
    scheduleReconnect("Couldn't connect");
  };

  const connect = async (): Promise<void> => {
    if (!running) return;
    cancelRetry?.();
    cancelRetry = null;
    dropSocket();
    const gen = generation;
    setStatus({ kind: "connecting", attempt });
    let ticket: string;
    try {
      ticket = (await deps.requestTicket()).ticket;
    } catch (error) {
      if (gen === generation) handleConnectError(error);
      return;
    }
    if (gen !== generation || !running) return;
    try {
      socket = deps.createSocket(deps.socketUrl(ticket), {
        onOpen: () => {
          if (gen !== generation) return;
          lastMessageAt = deps.now();
          send({ type: "subscribe", after: lastCursor });
          heartbeat(gen);
        },
        onMessage: (data) => {
          if (gen !== generation) return;
          lastMessageAt = deps.now();
          const parsed = parseServerMessage(data);
          if (parsed) handleMessage(gen, parsed);
        },
        onClose: (code) => {
          if (gen === generation) handleClose(code);
        },
        onError: () => {
          // Browsers always follow an error with a close event, which drives reconnection.
        }
      });
    } catch {
      scheduleReconnect("Couldn't open a connection");
    }
  };

  const reconnectNow = (): void => {
    if (!running) return;
    attempt = 0;
    void connect();
  };

  return {
    start(after) {
      running = true;
      lastCursor = after;
      attempt = 0;
      void connect();
    },
    stop() {
      if (status.kind === "idle") return;
      stopWith("stopped", "Disconnected");
    },
    resume() {
      if (!running) return;
      if (status.kind === "waiting") reconnectNow();
      else if (status.kind === "live" && deps.now() - lastMessageAt > options.heartbeatIntervalMs) {
        // After the app was in the background the socket may be dead without a close event: start over.
        reconnectNow();
      }
    },
    status: () => status,
    cursor: () => lastCursor
  };
}

function parseServerMessage(data: string): RealtimeServerMessage | null {
  try {
    const parsed = realtimeServerMessageSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
