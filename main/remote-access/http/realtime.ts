import { realtimeClientMessageSchema } from "@shared/remote-access/runtimeApi";
import { remoteEvent } from "./remoteRuns";
import { REALTIME_CLOSE_CODES, REMOTE_LIMITS } from "@shared/remote-access/constants";
import type { RemoteIdentity } from "@main/types/remote-access/auth.types";
import type { RuntimeApiOptions, RealtimePeer, RealtimeTickets } from "@main/types/remote-access/http/runtime.types";
import { requireRemoteConversation } from "./readRoutes";

/** Read-only event transport; mutations always use authenticated, idempotent HTTP commands. */
export function attachRuntimeRealtime(options: RuntimeApiOptions, tickets: RealtimeTickets, peer: RealtimePeer, initial: RemoteIdentity): void {
  let identity = initial;
  let unsubscribe = (): void => {};
  let closed = false;
  let lastCursor = options.host.eventCursor();
  let messages = 0;
  let windowStart = options.now();
  let deadline: ReturnType<typeof setTimeout> | null = null;
  const allowed = () => options.permits(identity) && identity.expiresAt > options.now();
  const close = (code: number): void => {
    if (closed) return;
    closed = true; unsubscribe();
    if (deadline) clearTimeout(deadline);
    peer.close(code);
  };
  const armDeadline = (): string => {
    if (deadline) clearTimeout(deadline);
    const expiresAt = Math.min(identity.expiresAt, options.now() + REMOTE_LIMITS.realtimeAuthDeadlineMs);
    deadline = setTimeout(() => close(REALTIME_CLOSE_CODES.authExpired), Math.max(1, expiresAt - options.now()));
    deadline.unref();
    return new Date(expiresAt).toISOString();
  };
  const resync = (): void => {
    peer.send({ type: "resync", cursor: lastCursor });
    close(REALTIME_CLOSE_CODES.overloaded);
  };
  peer.onClose(() => { closed = true; unsubscribe(); if (deadline) clearTimeout(deadline); });
  peer.onMessage((text) => {
    if (closed) return;
    if (!allowed()) { close(REALTIME_CLOSE_CODES.authExpired); return; }
    if (options.now() - windowStart >= 60_000) { messages = 0; windowStart = options.now(); }
    if (++messages > 120) { close(REALTIME_CLOSE_CODES.overloaded); return; }
    try {
      const input: unknown = JSON.parse(text);
      const message = realtimeClientMessageSchema.parse(input);
      switch (message.type) {
        case "ping": if (!peer.send({ type: "pong" })) resync(); return;
        case "auth": {
          const next = tickets.consume(message.ticket);
          if (!next || !options.permits(next) || next.userId !== identity.userId || next.sessionId !== identity.sessionId) { close(REALTIME_CLOSE_CODES.forbidden); return; }
          identity = next;
          if (!peer.send({ type: "authenticated", authExpiresAt: armDeadline() })) resync();
          return;
        }
        case "subscribe":
          if (message.conversationId) requireRemoteConversation(options, message.conversationId);
          const replay = options.host.history(message.conversationId, message.after, REMOTE_LIMITS.eventPageLimit);
          // The native subscription replays synchronously. Large gaps must use paginated HTTP catch-up instead
          // of blocking the desktop event loop or filling a socket before we can obtain its unsubscribe handle.
          if (replay.events.length >= REMOTE_LIMITS.eventPageLimit) { lastCursor = message.after; resync(); return; }
          unsubscribe(); lastCursor = message.after;
          unsubscribe = options.host.subscribe({ after: message.after, ...(message.conversationId ? { conversationId: message.conversationId } : {}),
            onEvent: (event) => {
              if (closed) return;
              if (!allowed()) { close(REALTIME_CLOSE_CODES.authExpired); return; }
              if (!peer.send({ type: "event", event: remoteEvent(event) })) { resync(); return; }
              lastCursor = event.cursor;
            }, onError: resync });
          if (closed) unsubscribe();
          return;
      }
    } catch { peer.send({ type: "error", code: "invalid", message: "This realtime message is invalid. Refresh the runtime state and retry." }); }
  });
  if (!allowed()) { close(REALTIME_CLOSE_CODES.forbidden); return; }
  if (!peer.send({ type: "ready", cursor: options.host.eventCursor(), authExpiresAt: armDeadline() })) resync();
}
