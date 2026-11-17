import assert from "node:assert/strict";
import test from "node:test";
import { createToolUsageStore } from "@/components/app/logic/toolUsageStore";
import type { ToolUsageInfo } from "@shared/appTypes";

const usage = (percentLeft: number): ToolUsageInfo => ({
  status: "available",
  title: "Usage",
  windows: [{ id: "session", period: "session", label: "Session", shortLabel: "S", percentLeft, resetsLabel: null }],
  account: null,
  lines: [],
  fetchedAt: "2026-11-11T00:00:00.000Z"
});

test("concurrent and fresh loads share one request until the freshness window passes", async () => {
  let clock = 0;
  let calls = 0;
  const store = createToolUsageStore({ fetchUsage: async () => usage(100 - ++calls), now: () => clock, maxAgeMs: 1000 });
  const first = store.load("claude");
  assert.equal(store.load("claude"), first);
  assert.equal(store.getSnapshot().claude?.loading, true);
  await first;
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().claude?.info?.windows[0]?.percentLeft, 99);

  clock = 999;
  await store.load("claude");
  assert.equal(calls, 1);
  await store.load("claude", { force: true });
  assert.equal(calls, 2);
  clock = 5000;
  await store.load("claude");
  assert.equal(calls, 3);
});

test("failures keep the last usage, record the error and notify subscribers", async () => {
  let fail = false;
  const store = createToolUsageStore({
    fetchUsage: async () => { if (fail) throw new Error("offline"); return usage(40); },
    now: () => 0,
    maxAgeMs: 0
  });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  await store.load("codex");
  fail = true;
  await store.load("codex");
  const entry = store.getSnapshot().codex;
  assert.equal(entry?.error, "offline");
  assert.equal(entry?.info?.windows[0]?.percentLeft, 40);
  assert.equal(entry?.loading, false);
  assert.equal(notifications, 4);
  unsubscribe();
  await store.load("codex");
  assert.equal(notifications, 4);
});
