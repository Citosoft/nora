import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { SqliteExecutionStore } from "@main/execution/sqliteStore";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { fixture } from "./fixture";

test("large transcripts page by stable insertion position while live reads exclude historical items and turns", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const run = f.snapshot().runs[0];
  const at = run.createdAt;
  f.store.transaction((transaction) => {
    for (let index = 0; index < 250; index++) {
      const runId = `old-${index}`;
      const event = transaction.appendEvent(`old-run-${index}`, "conversation", at,
        { kind: "run", run: { ...run, id: runId, attemptId: runId, state: "completed" } });
      transaction.project(event);
    }
    for (let index = 0; index < 5000; index++) {
      const item: TimelineItem = { kind: "message", role: "assistant", id: `old-item-${index}`, runId: "old-0",
        createdAt: at, text: "x".repeat(512), complete: true };
      transaction.project(transaction.appendEvent(`old-event-${index}`, "conversation", at, { kind: "item", item }));
    }
  });
  assert.equal(f.store.state("conversation")?.runs.length, 1);
  assert.equal(f.store.execution("conversation", run.id)?.items.length, 1);
  assert.equal(f.store.header("conversation")?.activeRuns.length, 1);
  // Guard the production path against accidentally reintroducing whole-history hydration.
  f.store.snapshot = () => { throw new Error("Full exports must not be used for live execution"); };
  f.store.snapshots = () => { throw new Error("Full exports must not be used for live execution"); };
  const first = f.store.history({ conversationId: "conversation", scope: "timeline", limit: 73 });
  assert.equal(first.scope, "timeline");
  assert.ok(first.scope === "timeline" && first.items.length === 73 && first.nextBefore);
  const initialIds = first.items.map((item) => item.id);
  f.engine.accept({ kind: "item", eventId: "stream-1", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { kind: "message", role: "assistant", id: "current", runId: run.id, createdAt: at, text: "Hello", complete: false } });
  f.engine.accept({ kind: "item", eventId: "stream-2", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { kind: "message", role: "assistant", id: "current", runId: run.id, createdAt: at, text: "Hello world", complete: true } });
  const seen = new Set(initialIds);
  let before: number | null = first.nextBefore;
  while (before !== null) {
    const page = f.store.history({ conversationId: "conversation", scope: "timeline", limit: 73, before });
    assert.ok(page.scope === "timeline");
    for (const item of page.items) { assert.equal(seen.has(item.id), false); seen.add(item.id); }
    before = page.nextBefore;
  }
  assert.equal(seen.size, 5001);
  assert.equal(seen.has("current"), false); // It arrived above the first page's boundary.
  const current = f.store.history({ conversationId: "conversation", scope: "timeline", limit: 1 });
  assert.ok(current.scope === "timeline" && current.items[0].kind === "message");
  assert.equal(current.items[0].text, "Hello world");
  f.command({ kind: "submit", commandId: "next", conversationId: "conversation", runId: "next", instruction: "Next" });
  f.engine.accept({ kind: "finished", eventId: "finish", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    status: "completed", failure: null, usage: null });
  assert.equal(f.store.header("conversation")?.activeRuns[0].id, "next");
  assert.throws(() => f.command({ kind: "submit", commandId: "reuse", conversationId: "conversation", runId: "old-1", instruction: "Again" }), /already exists/);
  assert.equal(f.store.summaries()[0].latestRun?.id, "next");
});

test("history pages remain scoped, reject invalid bounds, and expose a replay cursor", (t) => {
  const f = fixture(t); f.create(); f.submit(); f.create("other"); f.submit("other-run", "other");
  const header = f.store.header("conversation"); assert.ok(header);
  f.submit("queued");
  const page = f.store.history({ conversationId: "conversation", scope: "runs", limit: 1 });
  assert.ok(page.scope === "runs"); assert.equal(page.runs[0].id, "queued"); assert.ok(page.nextBefore);
  const previous = f.store.history({ conversationId: "conversation", scope: "runs", before: page.nextBefore, limit: 1 });
  assert.ok(previous.scope === "runs"); assert.equal(previous.runs[0].id, "run"); assert.equal(previous.nextBefore, null);
  assert.equal(f.store.summaries("not-a-project").length, 0);
  const events = f.store.events(header.cursor, 200, "conversation");
  assert.ok(events.length); assert.equal(events.at(-1)?.cursor, page.cursor);
  assert.throws(() => f.store.history({ conversationId: "conversation", scope: "runs", limit: 201 }), /between 1 and 200/);
  assert.throws(() => f.store.history({ conversationId: "conversation", scope: "runs", before: 0 }), /positive integer/);
  assert.throws(() => f.store.history({ conversationId: "missing", scope: "timeline" }), /does not exist/);
});

test("version two snapshot migration preserves journal identities, projections, receipts, effects and ownership", (t) => {
  const f = fixture(t); f.create(); const receipt = f.submit();
  const before = f.snapshot(); const events = f.store.events(0, 200); const effects = f.store.effects();
  f.store.claimOwnership({ id: "preserved-owner", processId: 42 }, null);
  f.store.close();
  const legacy = new DatabaseSync(f.path);
  legacy.exec(`DROP TABLE conversation_requests; DROP TABLE conversation_items; DROP TABLE conversation_runs;
    DROP TABLE conversation_heads; DROP INDEX unfinished_effects; CREATE TABLE conversations (id TEXT PRIMARY KEY, json TEXT NOT NULL);
    PRAGMA user_version = 2`);
  legacy.prepare("INSERT INTO conversations VALUES (?, ?)").run(before.conversation.id, JSON.stringify(before));
  legacy.close(); f.restart();
  assert.deepEqual(f.snapshot(), before); assert.deepEqual(f.submit(), receipt);
  assert.deepEqual(f.store.events(0, 200), events); assert.deepEqual(f.store.effects(), effects);
  assert.equal(f.store.ownership()?.id, "preserved-owner");
  f.restart(); assert.deepEqual(f.snapshot(), before);
});

test("an unreadable legacy projection rolls the complete schema upgrade back without dropping source data", (t) => {
  const f = fixture(t); f.store.close();
  const legacy = new DatabaseSync(f.path);
  legacy.exec(`DROP TABLE conversation_requests; DROP TABLE conversation_items; DROP TABLE conversation_runs;
    DROP TABLE conversation_heads; DROP INDEX unfinished_effects; CREATE TABLE conversations (id TEXT PRIMARY KEY, json TEXT NOT NULL);
    INSERT INTO conversations VALUES ('broken', '{'); PRAGMA user_version = 2`);
  assert.throws(() => new SqliteExecutionStore(f.path, "local"));
  assert.deepEqual(legacy.prepare("PRAGMA user_version").get(), Object.assign(Object.create(null), { user_version: 2 }));
  assert.equal(legacy.prepare("SELECT json FROM conversations").get()?.json, "{");
  assert.equal(legacy.prepare("SELECT name FROM sqlite_master WHERE name = 'conversation_heads'").get(), undefined);
  legacy.close();
});
