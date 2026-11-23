import assert from "node:assert/strict";
import { test } from "node:test";
import { presentRemoteDevices } from "@/components/app/logic/remote-access/devices";

const now = Date.parse("2026-11-22T10:30:00Z");

test("device rows say who is connected now and when the rest were last active", () => {
  assert.deepEqual(presentRemoteDevices([
    { id: "a", label: "iPhone · Nora app", connected: true, firstSeenAt: "2026-11-22T10:00:00.000Z", lastSeenAt: "2026-11-22T10:00:00.000Z" },
    { id: "b", label: null, connected: false, firstSeenAt: "2026-11-22T09:00:00.000Z", lastSeenAt: "2026-11-22T10:25:00.000Z" },
    { id: "c", label: "Safari on iPad", connected: false, firstSeenAt: "2026-11-22T10:29:40.000Z", lastSeenAt: "2026-11-22T10:29:40.000Z" }
  ], now), [
    { id: "a", label: "iPhone · Nora app", connected: true, status: "Connected now" },
    { id: "b", label: "Unknown device", connected: false, status: "Active 5m ago" },
    { id: "c", label: "Safari on iPad", connected: false, status: "Active just now" }
  ]);
});
