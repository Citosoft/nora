import assert from "node:assert/strict";
import test from "node:test";
import { createRealtimeTickets } from "@main/remote-access/http/tickets";
import { attachRuntimeRealtime } from "@main/remote-access/http/realtime";
import type { RealtimeServerMessage } from "@shared/types/remote-access/runtimeApi.types";
import { REALTIME_CLOSE_CODES } from "@shared/remote-access/constants";
import { runtimeFixture } from "./runtimeFixture";

test("realtime tickets expire, are one-use, and are cleared on revoke", () => {
  let now = 1000;
  const tickets = createRealtimeTickets(() => now);
  const identity = { userId: "owner", sessionId: "session", expiresAt: 100_000 };
  const first = tickets.issue(identity);
  assert.deepEqual(tickets.consume(first.ticket), identity); assert.equal(tickets.consume(first.ticket), null);
  const second = tickets.issue(identity); now += 31_000;
  assert.equal(tickets.consume(second.ticket), null);
  const third = tickets.issue(identity); tickets.clear(); assert.equal(tickets.consume(third.ticket), null);
});

test("stream replays ordered events, refreshes authentication and rejects ticket reuse", (t) => {
  const f = runtimeFixture(t); f.execution.create();
  const tickets = createRealtimeTickets(f.options.now);
  const identity = { userId: "owner", sessionId: "session", expiresAt: f.options.now() + 60_000 };
  const messages: RealtimeServerMessage[] = [];
  let onMessage = (_text: string): void => {};
  let onClose = (): void => {};
  const codes: number[] = [];
  attachRuntimeRealtime(f.options, tickets, { send(message) { messages.push(message); return true; }, close(code) { codes.push(code); onClose(); },
    onMessage(listener) { onMessage = listener; }, onClose(listener) { onClose = listener; } }, identity);
  t.after(() => onClose());
  onMessage(JSON.stringify({ type: "subscribe", after: 0 }));
  const events = messages.filter((message) => message.type === "event");
  assert.equal(events.length > 0, true);
  assert.deepEqual(events.map((message) => message.event.cursor), [...events.map((message) => message.event.cursor)].sort((a, b) => a - b));
  const ticket = tickets.issue(identity).ticket;
  onMessage(JSON.stringify({ type: "auth", ticket }));
  assert.equal(messages.at(-1)?.type, "authenticated");
  onMessage(JSON.stringify({ type: "auth", ticket }));
  assert.deepEqual(codes, [REALTIME_CLOSE_CODES.forbidden]);
});

test("stream stops delivering immediately after local disable and reports backpressure", (t) => {
  const f = runtimeFixture(t); f.execution.create();
  const tickets = createRealtimeTickets(f.options.now);
  const identity = { userId: "owner", sessionId: "session", expiresAt: f.options.now() + 60_000 };
  let onMessage = (_text: string): void => {};
  let onClose = (): void => {};
  let closed = 0;
  attachRuntimeRealtime(f.options, tickets, { send: () => true, close(code) { closed = code; onClose(); }, onMessage(next) { onMessage = next; }, onClose(next) { onClose = next; } }, identity);
  t.after(() => onClose());
  f.disable(); onMessage(JSON.stringify({ type: "ping" }));
  assert.equal(closed, REALTIME_CLOSE_CODES.authExpired);
});

test("large replay gaps request HTTP catch-up before attaching a synchronous native subscription", (t) => {
  const f = runtimeFixture(t); f.execution.create();
  for (let index = 0; index < 205; index++) f.execution.command({ kind: "rename", commandId: `rename-${index}`, conversationId: "conversation", title: `Thread ${index}` });
  const messages: RealtimeServerMessage[] = [];
  let onMessage = (_text: string): void => {};
  let onClose = (): void => {};
  attachRuntimeRealtime(f.options, createRealtimeTickets(f.options.now), {
    send(message) { messages.push(message); return true; }, close() { onClose(); },
    onMessage(listener) { onMessage = listener; }, onClose(listener) { onClose = listener; }
  }, { userId: "owner", sessionId: "session", expiresAt: f.options.now() + 60_000 });
  t.after(() => onClose());
  onMessage(JSON.stringify({ type: "subscribe", after: 0 }));
  assert.equal(messages.at(-1)?.type, "resync");
  assert.equal(messages.some((message) => message.type === "event"), false);
});
