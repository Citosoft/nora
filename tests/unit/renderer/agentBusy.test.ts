import assert from "node:assert/strict";
import test from "node:test";
import { isAgentBusyAt, nextAgentBusyDelay } from "@/components/app/logic/agentBusy";

const now = Date.parse("2026-11-17T12:00:00.000Z");
const deadline = (delay: number) => new Date(now + delay).toISOString();

test("idle agents and pushed busy states need no repeating clock", () => {
  assert.equal(nextAgentBusyDelay([], now), null);
  assert.equal(nextAgentBusyDelay([{ status: "running", busyUntil: null }, { status: "starting", busyUntil: deadline(100) }], now), null);
  assert.equal(nextAgentBusyDelay([{ status: "running", busyUntil: "invalid" }, { status: "running", busyUntil: deadline(-1) }], now), null);
});

test("busy deadlines wake once at the earliest pending transition", () => {
  const agents = [{ status: "running" as const, busyUntil: deadline(500), isBusy: true },
    { status: "running" as const, busyUntil: deadline(1000), isBusy: true }];
  assert.equal(nextAgentBusyDelay(agents, now), 500);
  assert.equal(isAgentBusyAt(agents[0], now + 499), true);
  assert.equal(isAgentBusyAt(agents[0], now + 500), false);
  assert.equal(nextAgentBusyDelay(agents, now + 500), 500);
  assert.equal(nextAgentBusyDelay(agents, now + 1000), null);
});
