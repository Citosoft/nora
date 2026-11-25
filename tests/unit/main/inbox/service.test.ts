import assert from "node:assert/strict";
import test from "node:test";
import { createInboxService } from "@main/inbox/service";
import { inboxItemId } from "@shared/inbox/projection";
import type { ConversationEvent, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { InboxLedger, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxServiceDeps } from "@main/types/inbox/inbox.types";
import type { LoopRun } from "@shared/types/loop.types";
import { conversation } from "../nora-tools/fixture";

function inboxFixture(stored: InboxLedger | null = null) {
  let now = "2026-11-18T12:00:00.000Z";
  let saved = stored;
  let summaries: ConversationSummary[] = [];
  const headers = new Map<string, ConversationHeader>();
  const timelines = new Map<string, TimelineItem[]>();
  const timers: (() => void)[] = [];
  let listener: EventSubscription | null = null;
  let runs: LoopRun[] = [];
  const deps: InboxServiceDeps = {
    host: { eventCursor: () => 0, summaries: () => summaries, header: (id) => headers.get(id) ?? null,
      conversationHistory: (query) => ({ schemaVersion: 1, conversationId: query.conversationId, scope: "timeline", cursor: 0, nextBefore: null, items: timelines.get(query.conversationId) ?? [] }),
      subscribe(subscription) { listener = subscription; return () => { listener = null; }; } },
    ledger: { read: () => saved, write: (next) => { saved = structuredClone(next); } },
    listWorkflowRuns: async () => runs,
    workspaceForProject: (projectId) => projectId === "shell-w" ? "w" : null,
    connectors: () => [],
    alerts: () => [],
    now: () => now,
    setTimeout(callback) { timers.push(callback); return { cancel() { const index = timers.indexOf(callback); if (index >= 0) timers.splice(index, 1); } }; }
  };
  return { deps, timelines, headers,
    get saved() { return saved; }, get listening() { return !!listener; },
    setNow(value: string) { now = value; }, setSummaries(next: ConversationSummary[]) { summaries = next; }, setRuns(next: LoopRun[]) { runs = next; },
    emit(kind: "run" | "item") { listener?.onEvent({ payload: { kind } } as ConversationEvent); },
    /** Runs the timers due now; a snooze's wake timer re-arms itself, so this never loops until empty. */
    flush() { for (const timer of timers.splice(0)) timer(); } };
}
const finished = (id: string, runId: string, updatedAt: string): ConversationSummary =>
  ({ conversation: conversation(id), latestRun: { id: runId, state: "completed", createdAt: updatedAt, updatedAt, failure: null }, queuedCount: 0, pendingRequestCount: 0 });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("the first start sets a baseline, so earlier work is not news, and later outcomes arrive with a preview", async () => {
  const f = inboxFixture();
  f.setSummaries([finished("old", "r0", "2026-11-18T11:00:00.000Z")]);
  const service = createInboxService(f.deps);
  const snapshots: InboxSnapshot[] = [];
  service.subscribe((snapshot) => snapshots.push(snapshot));
  const stop = service.start();
  assert.equal(f.saved?.baselineAt, "2026-11-18T12:00:00.000Z");
  assert.deepEqual(service.snapshot().items, []);
  f.timelines.set("new", [{ kind: "message", id: "m", runId: "r1", createdAt: "2026-11-18T12:05:00.000Z", role: "assistant", text: "All tests pass.", complete: true }]);
  f.setNow("2026-11-18T12:10:00.000Z");
  f.setSummaries([finished("old", "r0", "2026-11-18T11:00:00.000Z"), finished("new", "r1", "2026-11-18T12:05:00.000Z")]);
  f.emit("item"); f.flush();
  assert.equal(service.snapshot().items.length, 0, "streamed items do not rebuild the inbox");
  f.emit("run"); f.flush();
  const [item] = service.snapshot().items;
  assert.equal(item.kind === "outcome" ? item.preview : null, "All tests pass.");
  assert.equal(snapshots.at(-1), service.snapshot());
  stop();
  assert.equal(f.listening, false);
});

test("marks are saved, done is refused for what still needs the user, and snoozes wake on time", () => {
  const f = inboxFixture({ version: 1, baselineAt: "2026-11-18T00:00:00.000Z", marks: {} });
  const request: RuntimeRequest = { kind: "approval", id: "q", runId: "r", attemptId: "a", nativeId: "q", status: "pending", createdAt: "2026-11-18T09:00:00.000Z",
    expiresAt: "", title: "Deploy?", options: [{ id: "allow", label: "Allow" }] };
  const rex = conversation("rex");
  f.headers.set("rex", { schemaVersion: 1, cursor: 0, conversation: rex, activeRuns: [], queuedRuns: [], pendingRequests: [request] });
  f.setSummaries([{ conversation: rex, latestRun: null, queuedCount: 0, pendingRequestCount: 1 }, finished("t", "r1", "2026-11-18T10:00:00.000Z")]);
  const service = createInboxService(f.deps);
  service.start();
  const outcome = inboxItemId.outcome("t", "r1"), waiting = inboxItemId.request("q");
  service.execute({ kind: "mark-thread-read", conversationId: "t" });
  assert.equal(f.saved?.marks[outcome]?.readAt, "2026-11-18T12:00:00.000Z");
  assert.throws(() => service.execute({ kind: "mark-done", itemIds: [waiting] }), /resolved/);
  assert.throws(() => service.execute({ kind: "snooze", itemIds: [waiting], until: "2026-11-18T11:00:00.000Z" }), /future/);
  service.execute({ kind: "snooze", itemIds: [waiting], until: "2026-11-18T13:00:00.000Z" });
  assert.equal(service.snapshot().items.find((item) => item.id === waiting)?.snoozedUntil, "2026-11-18T13:00:00.000Z");
  f.setNow("2026-11-18T13:00:01.000Z"); f.flush();
  assert.equal(service.snapshot().items.find((item) => item.id === waiting)?.snoozedUntil, null);
  service.execute({ kind: "mark-done", itemIds: [outcome] });
  assert.deepEqual(service.snapshot().items.map((item) => item.id), [waiting]);
});

test("workflow runs are read at start and followed after, and marks wait for them before pruning", async () => {
  const pausedAt = "2026-11-18T11:00:00.000Z";
  const runId = inboxItemId.workflow("run", "paused", pausedAt);
  const f = inboxFixture({ version: 1, baselineAt: "2026-11-18T00:00:00.000Z", marks: { [runId]: { snoozedUntil: "2026-11-19T00:00:00.000Z" } } });
  const run = { id: "run", projectId: "shell-w", definition: { name: "Ship it" }, objective: "Ship", status: "paused", stopReason: "A stage failed.", updatedAt: pausedAt } as LoopRun;
  f.setRuns([run]);
  const service = createInboxService(f.deps);
  service.start();
  assert.ok(f.saved?.marks[runId], "a mark survives while workflow runs are still loading");
  await settle(); f.flush();
  assert.deepEqual(service.snapshot().items.map((item) => [item.id, item.workspaceId, item.snoozedUntil]), [[runId, "w", "2026-11-19T00:00:00.000Z"]]);
  service.observeWorkflowRun({ ...run, status: "running", stopReason: null });
  f.flush();
  assert.deepEqual(service.snapshot().items, []);
  assert.deepEqual(f.saved?.marks, {});
});

test("connector and alert changes reuse thread reads until a conversation event invalidates them", (t) => {
  const f = inboxFixture();
  const summaries = t.mock.method(f.deps.host, "summaries");
  const service = createInboxService(f.deps);
  const stop = service.start();
  service.refreshConnectors();
  service.refreshAlerts();
  f.flush();
  assert.equal(summaries.mock.callCount(), 1);
  f.emit("run");
  f.flush();
  assert.equal(summaries.mock.callCount(), 2);
  stop();
});
