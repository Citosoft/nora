import { describe, expect, it } from "vitest";
import { REALTIME_CLOSE_CODES } from "@shared/remote-access/constants";
import { RemoteRequestError } from "@/api/http/remoteRequestError";
import { backoffDelay } from "@/realtime/backoff";
import { event, message } from "./fixtures/conversationFixtures";
import { flush, realtimeHarness } from "./fixtures/realtimeHarness";

const itemEvent = (cursor: number) => event(cursor, { kind: "item", item: message(`item-${cursor}`, `text ${cursor}`) });
const inMinutes = (now: number, minutes: number) => new Date(now + minutes * 60_000).toISOString();

async function connectLive(harness: ReturnType<typeof realtimeHarness>, cursor: number) {
  await flush();
  const socket = harness.latestSocket();
  socket.open();
  socket.receive({ type: "ready", cursor, authExpiresAt: inMinutes(harness.now, 5) });
  await flush();
  return socket;
}

describe("realtime connection", () => {
  it("opens with a ticket and subscribes from the starting cursor", async () => {
    const harness = realtimeHarness();
    harness.connection.start(42);
    const socket = await connectLive(harness, 42);
    expect(socket.url).toBe(`wss://abc123.remote.withnora.run/v1/realtime?ticket=ticket-${"1".padStart(40, "0")}`);
    expect(socket.sent[0]).toEqual({ type: "subscribe", after: 42 });
    expect(harness.connection.status()).toEqual({ kind: "live" });
  });

  it("delivers streamed events once, in order, ignoring replays at or below the cursor", async () => {
    const harness = realtimeHarness();
    harness.connection.start(10);
    const socket = await connectLive(harness, 10);
    socket.receive({ type: "event", event: itemEvent(9) });
    socket.receive({ type: "event", event: itemEvent(11) });
    socket.receive({ type: "event", event: itemEvent(11) });
    socket.receive({ type: "event", event: itemEvent(15) });
    expect(harness.delivered.map((entry) => entry.cursor)).toEqual([11, 15]);
    expect(harness.connection.cursor()).toBe(15);
  });

  it("refreshes auth with a new ticket before the deadline", async () => {
    const harness = realtimeHarness();
    harness.connection.start(0);
    const socket = await connectLive(harness, 0);
    await harness.advance(3 * 60_000);
    expect(socket.sent.filter((sent) => sent.type === "auth")).toHaveLength(0);
    await harness.advance(60_000 + 1);
    const auth = socket.sent.filter((sent) => sent.type === "auth");
    expect(auth).toEqual([{ type: "auth", ticket: `ticket-${"2".padStart(40, "0")}` }]);
    expect(harness.sockets).toHaveLength(1);
  });

  it("reconnects immediately with a fresh ticket after an auth-expired close", async () => {
    const harness = realtimeHarness();
    harness.connection.start(5);
    const first = await connectLive(harness, 5);
    first.receive({ type: "event", event: itemEvent(6) });
    first.closeFromServer(REALTIME_CLOSE_CODES.authExpired);
    await flush();
    expect(harness.sockets).toHaveLength(2);
    expect(harness.tickets).toBe(2);
    harness.latestSocket().open();
    expect(harness.latestSocket().sent[0]).toEqual({ type: "subscribe", after: 6 });
  });

  it("stops and surfaces an auth error on a forbidden close", async () => {
    const harness = realtimeHarness();
    harness.connection.start(0);
    const socket = await connectLive(harness, 0);
    socket.closeFromServer(REALTIME_CLOSE_CODES.forbidden);
    await harness.advance(120_000);
    expect(harness.connection.status()).toMatchObject({ kind: "stopped", reason: "forbidden" });
    expect(harness.sockets).toHaveLength(1);
  });

  it("backs off exponentially with jitter and resumes from the last cursor", async () => {
    const harness = realtimeHarness({ random: 0.5 });
    harness.connection.start(20);
    const first = await connectLive(harness, 20);
    first.receive({ type: "event", event: itemEvent(21) });
    first.closeFromServer(1006);
    await flush();
    expect(harness.connection.status()).toMatchObject({ kind: "waiting", attempt: 1 });
    expect(harness.pendingTimerDelays()).toEqual([750]);

    await harness.advance(750);
    harness.latestSocket().closeFromServer(1006);
    await flush();
    expect(harness.pendingTimerDelays()).toEqual([1_500]);

    await harness.advance(1_500);
    const third = harness.latestSocket();
    third.open();
    expect(third.sent[0]).toEqual({ type: "subscribe", after: 21 });
    third.receive({ type: "ready", cursor: 21, authExpiresAt: inMinutes(harness.now, 5) });
    expect(harness.connection.status()).toEqual({ kind: "live" });
  });

  it("caps the backoff window", () => {
    expect(backoffDelay(20, 1_000, 30_000, () => 0)).toBe(15_000);
    expect(backoffDelay(20, 1_000, 30_000, () => 0.999999)).toBeLessThanOrEqual(30_000);
    expect(backoffDelay(0, 1_000, 30_000, () => 0)).toBe(500);
  });

  it("catches up over HTTP across several pages after a resync, then resubscribes", async () => {
    const harness = realtimeHarness({ pages: [
      { schemaVersion: 1, after: 30, nextCursor: 32, events: [itemEvent(31), itemEvent(32)] },
      { schemaVersion: 1, after: 32, nextCursor: 40, events: [itemEvent(35), itemEvent(40)] },
      { schemaVersion: 1, after: 40, nextCursor: 40, events: [] }
    ] });
    harness.connection.start(30);
    const socket = await connectLive(harness, 30);
    socket.receive({ type: "resync", cursor: 30 });
    socket.receive({ type: "event", event: itemEvent(41) });
    socket.receive({ type: "event", event: itemEvent(35) });
    await flush();
    await flush();
    expect(harness.pageRequests).toEqual([30, 32, 40]);
    expect(harness.delivered.map((entry) => entry.cursor)).toEqual([31, 32, 35, 40, 41]);
    expect(socket.sent.at(-1)).toEqual({ type: "subscribe", after: 41 });
    expect(harness.connection.status()).toEqual({ kind: "live" });
  });

  it("catches up after reconnecting when the runtime moved on, deduplicating replayed events", async () => {
    const harness = realtimeHarness({ pages: [{ schemaVersion: 1, after: 50, nextCursor: 52, events: [itemEvent(51), itemEvent(52)] }] });
    harness.connection.start(50);
    const first = await connectLive(harness, 50);
    first.closeFromServer(1006);
    await harness.advance(1_000);
    const second = harness.latestSocket();
    second.open();
    second.receive({ type: "event", event: itemEvent(51) });
    second.receive({ type: "ready", cursor: 52, authExpiresAt: inMinutes(harness.now, 5) });
    second.receive({ type: "event", event: itemEvent(52) });
    await flush();
    await flush();
    expect(harness.pageRequests).toEqual([51, 52]);
    expect(harness.delivered.map((entry) => entry.cursor)).toEqual([51, 52]);
  });

  it("reloads state when the runtime no longer has the missed events", async () => {
    const pruned = new RemoteRequestError("runtime", { kind: "api", status: 410, code: "cursor-unavailable", message: "Pruned" });
    const harness = realtimeHarness({ pages: [pruned] });
    harness.connection.start(5);
    const socket = await connectLive(harness, 5);
    socket.receive({ type: "resync", cursor: 5 });
    await flush();
    await flush();
    expect(harness.resets).toBe(1);
    expect(harness.connection.cursor()).toBe(500);
    expect(socket.sent.at(-1)).toEqual({ type: "subscribe", after: 500 });
    expect(harness.connection.status()).toEqual({ kind: "live" });
  });

  it("reconnects at once when resumed while waiting", async () => {
    const harness = realtimeHarness();
    harness.connection.start(0);
    const socket = await connectLive(harness, 0);
    socket.closeFromServer(1006);
    await flush();
    expect(harness.connection.status().kind).toBe("waiting");
    harness.connection.resume();
    await flush();
    expect(harness.sockets).toHaveLength(2);
  });

  it("treats a silent socket as dead and reconnects", async () => {
    const harness = realtimeHarness();
    harness.connection.start(0);
    const socket = await connectLive(harness, 0);
    socket.autoPong = false;
    await harness.advance(25_000);
    expect(socket.sent.at(-1)).toEqual({ type: "ping" });
    await harness.advance(50_000);
    expect(socket.closedByClient).toBe(4000);
    expect(harness.connection.status().kind).toBe("waiting");
  });
});
