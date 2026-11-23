import assert from "node:assert/strict";
import test from "node:test";
import { createRemotePresence } from "@main/remote-access/presence";
import { describeRemoteClient } from "@main/remote-access/http/clientLabel";

const identity = (sessionId: string) => ({ userId: "owner", sessionId, expiresAt: Number.MAX_SAFE_INTEGER });

function fixture() {
  let now = Date.parse("2026-11-22T10:00:00Z");
  let changes = 0;
  const closed: string[] = [];
  const presence = createRemotePresence({ now: () => now, onChanged: () => { changes += 1; }, revoked: () => false });
  return { presence, closed, advance(ms: number) { now += ms; }, changes: () => changes,
    socket: (sessionId: string) => presence.connect(identity(sessionId), () => closed.push(sessionId)) };
}

test("devices appear on first request, keep their label and report activity at most once a minute", () => {
  const f = fixture();
  f.presence.seen(identity("phone"), "iPhone · Nora app");
  assert.equal(f.changes(), 1);
  f.advance(5_000); f.presence.seen(identity("phone"), "iPhone · Nora app");
  assert.equal(f.changes(), 1, "frequent requests do not churn the view");
  assert.equal(f.presence.devices()[0].lastSeenAt, "2026-11-22T10:00:00.000Z");
  f.advance(60_000); f.presence.seen(identity("phone"), null);
  assert.equal(f.changes(), 2);
  assert.deepEqual(f.presence.devices(), [{ id: "phone", label: "iPhone · Nora app", connected: false, firstSeenAt: "2026-11-22T10:00:00.000Z", lastSeenAt: "2026-11-22T10:01:05.000Z" }]);
});

test("open realtime sockets mark a device connected until the last one closes, and connected devices sort first", () => {
  const f = fixture();
  f.presence.seen(identity("laptop"), "Chrome on Mac");
  f.advance(1_000);
  f.presence.seen(identity("phone"), "iPhone · Nora app");
  const first = f.socket("laptop");
  const second = f.socket("laptop");
  assert.deepEqual(f.presence.devices().map((device) => [device.id, device.connected]), [["laptop", true], ["phone", false]]);
  first(); first();
  assert.equal(f.presence.devices()[0].connected, true, "releasing twice does not drop the other socket");
  second();
  assert.deepEqual(f.presence.devices().map((device) => [device.id, device.connected]), [["laptop", false], ["phone", false]]);
});

test("clearing forgets devices and late socket closes do not bring them back", () => {
  const f = fixture();
  const release = f.socket("phone");
  f.presence.clear();
  release();
  assert.deepEqual(f.presence.devices(), []);
  assert.deepEqual(f.closed, ["phone"]);
});

test("disconnecting a device closes each of its sockets and removes only that device", () => {
  const f = fixture();
  f.socket("phone"); f.socket("phone"); f.presence.seen(identity("tablet"), "iPad · Nora app");
  f.presence.disconnect("phone");
  assert.deepEqual(f.closed, ["phone", "phone"]);
  assert.deepEqual(f.presence.devices().map((device) => device.id), ["tablet"]);
});

test("client labels prefer the app's own name and fall back to the browser and platform", () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);
  assert.equal(describeRemoteClient(headers({ "X-Nora-Client": "iPhone · Nora app" })), "iPhone · Nora app");
  assert.equal(describeRemoteClient(headers({ "X-Nora-Client": "<script>", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" })), "Safari on iPhone");
  assert.equal(describeRemoteClient(headers({ "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36" })), "Chrome on Android");
  assert.equal(describeRemoteClient(headers({ "X-Nora-Client": "x".repeat(49) })), null);
  assert.equal(describeRemoteClient(headers({ "User-Agent": "okhttp/4.12.0" })), null);
});
