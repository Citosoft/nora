import assert from "node:assert/strict";
import test from "node:test";
import { canBulkSettleThread, preselectSettlements, settleThreadBatch } from "@/components/app/logic/thread-workspace/bulkSettlement";
import { buildResumableThreadRows } from "@/components/app/logic/thread-workspace/listRows";
import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";

const now = Date.parse("2026-11-23T12:00:00Z");
const row = (id: string, days = 8): ThreadListRow => ({ id, title: id, workspaceId: "workspace", providerKind: "codex",
  target: { kind: "thread", conversationId: id }, status: "Completed", active: false, working: false, unread: false,
  attention: false, pinned: false, selected: false, hasDraft: false, queuedCount: 0,
  updatedAt: new Date(now - days * 86400_000).toISOString() });
const external = (): ThreadListRow => buildResumableThreadRows([{ workspaceId: "workspace", workspaceName: "Workspace", workspacePath: "/workspace",
  session: { id: "external", title: "External", providerKind: "codex", instanceId: "local", origin: "cli", cwd: "/workspace",
    createdAt: row("old", 60).updatedAt, updatedAt: row("old").updatedAt } }], null)[0];

test("preselection uses last activity and a strict age cutoff across Nora and outside threads", () => {
  const outside = external();
  const rows = [row("old"), row("cutoff", 7), row("recent", 1), row("future", -1), outside,
    { ...row("invalid"), updatedAt: "invalid" }];
  assert.deepEqual([...preselectSettlements(rows, 7, now)], ["old", outside.id]);
  assert.deepEqual([...preselectSettlements(rows, 14, now)], []);
  assert.equal(rows.length, 6);
});

test("pinned threads and threads needing attention require manual selection", () => {
  const rows = [{ ...row("pinned"), pinned: true }, { ...row("attention"), attention: true },
    { ...row("waiting"), waitingOn: { conversationId: "worker", name: "Worker" } }];
  assert.equal(preselectSettlements(rows, 7, now).size, 0);
  assert.ok(rows.every(canBulkSettleThread));
});

test("running, queued, draft, settled and importing threads cannot be bulk settled", () => {
  const outside = external();
  assert.equal(outside.target.kind, "external");
  const rows: ThreadListRow[] = [{ ...row("active"), active: true }, { ...row("queued"), queuedCount: 1 },
    { ...row("draft"), target: { kind: "draft", documentId: "draft" } }, { ...row("settled"), settled: true }];
  if (outside.target.kind === "external") rows.push({ ...outside, target: { ...outside.target, disabled: true } });
  assert.ok(rows.every((entry) => !canBulkSettleThread(entry)));
  assert.equal(preselectSettlements(rows, 7, now).size, 0);
});

test("batch settles sequentially, preserves successes and reports per-thread failures", async () => {
  const rows = [row("one"), external(), row("three")];
  const calls: string[] = [];
  const progress: number[] = [];
  let running = false;
  const result = await settleThreadBatch({ ids: [...rows.map((entry) => entry.id), "one"], findRow: (id) => rows.find((entry) => entry.id === id),
    async settle(entry) {
      assert.equal(running, false);
      running = true;
      calls.push(entry.id);
      await Promise.resolve();
      running = false;
      if (entry.target.kind === "external") throw new Error("Provider unavailable");
    }, onProgress: (count) => progress.push(count) });
  assert.deepEqual(calls, rows.map((entry) => entry.id));
  assert.deepEqual(result.completed, ["one", "three"]);
  assert.deepEqual(result.errors, { [rows[1].id]: "Provider unavailable" });
  assert.deepEqual(progress, [1, 2, 3]);
});

test("batch rechecks eligibility before each update and continues past unavailable threads", async () => {
  const rows = [row("one"), row("two"), row("three")];
  const calls: string[] = [];
  const result = await settleThreadBatch({ ids: [...rows.map((entry) => entry.id), "missing"], findRow: (id) => rows.find((entry) => entry.id === id),
    async settle(entry) {
      calls.push(entry.id);
      if (entry.id === "one") rows[1] = { ...rows[1], active: true };
      if (entry.id === "three") throw "transport error";
    }, onProgress() {} });
  assert.deepEqual(calls, ["one", "three"]);
  assert.deepEqual(result.completed, ["one"]);
  assert.match(result.errors.two, /no longer available/);
  assert.match(result.errors.missing, /no longer available/);
  assert.equal(result.errors.three, "The thread could not be settled.");
});
