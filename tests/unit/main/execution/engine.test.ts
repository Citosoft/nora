import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { SqliteExecutionStore } from "@main/execution/sqliteStore";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import { fixture, provider } from "./fixture";

test("command acceptance is durable, idempotent and separate from execution", (t) => {
  const f = fixture(t);
  f.create();
  const receipt = f.submit();
  const cursor = f.store.cursor();
  assert.equal(f.snapshot().runs[0].state, "starting");
  assert.equal(f.store.effects().filter((effect) => effect.status === "pending").length, 1);
  assert.deepEqual(f.submit(), receipt);
  assert.equal(f.store.cursor(), cursor);
  f.restart();
  assert.deepEqual(f.submit(), receipt);
  assert.throws(() => f.command({ kind: "submit", commandId: "submit-conversation-run", conversationId: "conversation", runId: "run", instruction: "different" }), /different content/);
});

test("transaction rollback commits neither receipt, projection, outbox nor notification", (t) => {
  const f = fixture(t);
  f.create();
  const cursor = f.store.cursor();
  const seen: ConversationEvent[] = [];
  f.engine.subscribe({ after: cursor, onEvent: (event) => seen.push(event), onError: (error) => { throw error; } });
  const database = new DatabaseSync(f.path);
  database.exec("CREATE TRIGGER reject_effect BEFORE INSERT ON effects BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  assert.throws(() => f.submit(), /injected failure/);
  assert.equal(f.store.cursor(), cursor);
  assert.equal(f.snapshot().runs.length, 0);
  assert.equal(f.store.receipt(JSON.stringify(["command", "conversation", "submit-conversation-run"])), null);
  assert.deepEqual(seen, []);
  database.exec("DROP TRIGGER reject_effect");
  database.close();
  f.submit();
  assert.ok(seen.length);
});

test("root turns serialize, queued instructions edit/remove, independent conversations admit concurrently", (t) => {
  const f = fixture(t);
  f.create(); f.create("other");
  f.submit(); f.submit("second"); f.submit("third"); f.submit("parallel", "other");
  assert.deepEqual(f.snapshot().runs.map((run) => run.state), ["starting", "queued", "queued"]);
  assert.equal(f.snapshot("other").runs[0].state, "starting");
  assert.equal(f.snapshot().runs[0].startedAt, "2026-10-21T10:00:00.000Z");
  assert.equal(f.snapshot().runs[1].startedAt, undefined);
  f.command({ kind: "edit-queued", commandId: "edit", conversationId: "conversation", runId: "second", instruction: "edited" });
  f.command({ kind: "remove-queued", commandId: "remove", conversationId: "conversation", runId: "third" });
  assert.throws(() => f.command({ kind: "edit-queued", commandId: "bad-edit", conversationId: "conversation", runId: "run", instruction: "too late" }), /Only unsent/);
  f.setTime("2026-10-21T10:01:00.000Z");
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  assert.equal(f.snapshot().runs[1].state, "starting");
  assert.equal(f.snapshot().runs[1].startedAt, "2026-10-21T10:01:00.000Z");
  assert.equal(f.snapshot().items.at(-1)?.kind, "message");
  assert.equal(f.snapshot().runs[1].instruction, "edited");
});

test("writer conflict and host mismatch reject before native admission", (t) => {
  const f = fixture(t);
  f.create("one", "checkout"); f.create("two", "checkout"); f.submit("work", "one");
  assert.throws(() => f.submit("work", "two"), /isolated worktree/);
  assert.equal(f.snapshot("two").runs.length, 0);
  assert.throws(() => f.command({ kind: "create", commandId: "remote-create", conversationId: "remote", title: "Remote", parentId: null, provider,
    workspace: { projectId: "p", environmentId: "ssh", checkoutId: "c", path: "/remote", branch: "main", access: "write" } }), /different execution host/);
});

test("snapshot cursor replay has no gaps even when replay causes reentrant commands", (t) => {
  const f = fixture(t);
  f.create();
  const cursor = f.snapshot().cursor;
  f.submit();
  const seen: number[] = [];
  const unsubscribe = f.engine.subscribe({ after: cursor, conversationId: "conversation", onError: (error) => { throw error; },
    onEvent(event) { seen.push(event.cursor); if (seen.length === 1) f.submit("reentrant"); } });
  assert.deepEqual(seen, f.store.events(cursor, 200, "conversation").map((event) => event.cursor));
  assert.equal(new Set(seen).size, seen.length);
  const seenBeforeUnsubscribe = seen.length;
  unsubscribe();
  f.submit("later");
  assert.equal(seen.length, seenBeforeUnsubscribe);
  assert.throws(() => f.engine.subscribe({ after: 1e9, onEvent() {}, onError() {} }), /hydrate/);
});

test("observer failures do not reject committed commands", (t) => {
  const f = fixture(t);
  f.create();
  f.engine.subscribe({ after: f.store.cursor(), onEvent() { throw new Error("view closed"); }, onError() { throw new Error("observer died"); } });
  assert.doesNotThrow(() => f.submit());
  assert.equal(f.snapshot().runs[0].state, "starting");
});

test("unclaimed start is safe to recover; claimed uncertain submission is reconciled without resubmit", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  f.restart(); f.engine.recover();
  assert.equal(f.snapshot().runs[0].state, "starting");
  const effect = f.engine.claimEffect();
  assert.equal(effect?.action.kind, "start");
  f.restart(); f.engine.recover();
  assert.equal(f.snapshot().runs[0].state, "recovering");
  const effects = f.store.effects().filter((entry) => entry.status === "pending");
  assert.deepEqual(effects.map((entry) => entry.action.kind), ["reconcile"]);
  f.engine.recover();
  assert.equal(f.store.effects().filter((entry) => entry.status === "pending").length, 1);
});

test("interrupt before provider submission cancels outbox work without starting native execution", (t) => {
  const f = fixture(t);
  f.create(); f.submit(); f.submit("queued");
  f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
  assert.equal(f.snapshot().runs[0].state, "interrupted");
  assert.equal(f.snapshot().runs[1].state, "queued");
  assert.equal(f.snapshot().conversation.queuePaused, true);
  assert.equal(f.engine.claimEffect(), null);
  f.command({ kind: "continue-queue", commandId: "continue", conversationId: "conversation" });
  assert.equal(f.snapshot().runs[1].state, "starting");
});

test("recovery retires claimed effects whose final outcome already committed", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const effect = f.engine.claimEffect(); assert.ok(effect);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.restart(); f.engine.recover();
  assert.equal(f.snapshot().runs[0].state, "completed");
  assert.equal(f.store.effect(effect.id)?.status, "done");
  assert.equal(f.engine.claimEffect(), null);
});

test("provider messages reconcile by item identity, terminal outcomes reject late activity", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  f.update({ kind: "started", eventId: "start", nativeConversationId: "thread", nativeTurnId: "turn" });
  const run = f.snapshot().runs[0];
  const base = { conversationId: "conversation", runId: run.id, attemptId: run.attemptId };
  const item = { id: "assistant", runId: run.id, kind: "message" as const, role: "assistant" as const,
    text: "Hel", complete: false, createdAt: "2026-10-21T10:00:00.000Z" };
  f.engine.accept({ ...base, kind: "item", eventId: "delta", item });
  f.engine.accept({ ...base, kind: "item", eventId: "final", item: { ...item, text: "Hello", complete: true } });
  f.engine.accept({ ...base, kind: "item", eventId: "late-partial", item });
  assert.equal(f.snapshot().items.filter((entry) => entry.id === "assistant").length, 1);
  const final = f.snapshot().items.find((entry) => entry.id === "assistant");
  assert.ok(final?.kind === "message"); assert.equal(final.text, "Hello");
  const cursor = f.store.cursor();
  f.engine.accept({ ...base, kind: "item", eventId: "final", item: { ...item, text: "Hello", complete: true } });
  assert.equal(f.store.cursor(), cursor);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 10, outputTokens: 5 } });
  f.engine.accept({ ...base, kind: "item", eventId: "after-turn", item: { ...item, text: "Wrong" } });
  assert.equal(f.snapshot().runs[0].state, "completed");
  assert.equal(f.snapshot().runs[0].review, "pending");
});

test("native approval choices are validated, persisted and expired across recovery", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  f.engine.claimEffect();
  f.update({ kind: "started", eventId: "start", nativeConversationId: "thread", nativeTurnId: "turn" });
  const run = f.snapshot().runs[0];
  f.engine.accept({ kind: "request", eventId: "approval", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    request: { id: "request", nativeId: "native-request", runId: run.id, attemptId: run.attemptId, status: "pending", kind: "approval",
      title: "Run tests?", createdAt: "2026-10-21T10:00:00.000Z", expiresAt: "2026-10-21T10:05:00.000Z", options: [{ id: "accept", label: "Allow once" }, { id: "decline", label: "Decline" }] } });
  assert.equal(f.snapshot().runs[0].state, "awaiting-approval");
  assert.throws(() => f.command({ kind: "respond", commandId: "bad-response", conversationId: "conversation", requestId: "request", response: { kind: "approval", optionId: "always" } }), /supported choices/);
  f.command({ kind: "respond", commandId: "response", conversationId: "conversation", requestId: "request", response: { kind: "approval", optionId: "accept" } });
  assert.equal(f.snapshot().requests[0].status, "responding");
  f.restart(); f.engine.recover();
  assert.equal(f.snapshot().requests[0].status, "expired");
  assert.throws(() => f.command({ kind: "respond", commandId: "stale-response", conversationId: "conversation", requestId: "request", response: { kind: "approval", optionId: "accept" } }), /no longer answerable/);
  assert.ok(f.store.effects().every((effect) => effect.action.kind !== "respond" || effect.status === "done"));
});

test("expired native requests cannot be answered even before recovery", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  const run = f.snapshot().runs[0];
  f.engine.accept({ kind: "request", eventId: "q", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    request: { id: "q", runId: run.id, attemptId: run.attemptId, nativeId: "q", kind: "question", status: "pending", title: "Choose",
      createdAt: "2026-10-21T10:00:00.000Z", expiresAt: "2026-10-21T10:01:00.000Z",
      questions: [{ id: "choice", text: "Which?", options: ["A", "B"], multiple: false }] } });
  f.setTime("2026-10-21T10:02:00.000Z");
  assert.throws(() => f.command({ kind: "respond", commandId: "expired", conversationId: "conversation", requestId: "q", response: { kind: "question", answers: { choice: ["A"] } } }), /no longer answerable/);
  f.engine.expireRequests();
  assert.equal(f.snapshot().requests[0].status, "expired");
  assert.equal(f.snapshot().runs[0].state, "recovering");
  assert.equal(f.engine.claimEffect(), null);
});

test("worker treats a throw after submission as uncertain and never retries the start", async (t) => {
  const f = fixture(t);
  const registry = new ProviderRegistry();
  let starts = 0;
  registry.register({ kind: "codex", instanceId: "account-a",
    capabilities: nativeCapabilities,
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "Test double", retryable: false } }; },
    async close() {},
    async start() { starts++; throw new Error("simulated connection loss containing secret"); },
    async interrupt() {}, async respond() {}, async reconcile() {} });
  const worker = new EffectWorker(f.engine, registry);
  f.create(); f.submit();
  assert.equal(await worker.runNext(), true);
  assert.equal(f.snapshot().runs[0].state, "recovering");
  assert.equal(f.snapshot().runs[0].failure?.message.includes("secret"), false);
  assert.equal(await worker.runNext(), false);
  assert.equal(starts, 1);
});

test("SQLite migration is versioned and environment ownership cannot be silently changed", (t) => {
  const f = fixture(t);
  assert.throws(() => new SqliteExecutionStore(f.path, "remote"), /different environment/);
  const database = new DatabaseSync(f.path);
  database.exec("PRAGMA user_version = 99"); database.close();
  assert.throws(() => new SqliteExecutionStore(f.path, "local"), /newer Nora/);
});

test("explicit native status checks deduplicate pending reconciliation without repeating uncertain instructions", (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("queued");
  const effect = f.engine.claimEffect(); assert.ok(effect);
  const run = f.snapshot().runs[0];
  f.engine.accept({ kind: "disconnected", eventId: "lost", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    failure: { code: "uncertain", message: "Native submission is uncertain", retryable: false } });
  const command = { kind: "reconcile" as const, commandId: "check", conversationId: "conversation", runId: run.id };
  const receipt = f.command(command); assert.deepEqual(f.command(command), receipt);
  f.command({ ...command, commandId: "check-again" });
  assert.equal(f.store.unfinishedEffects().filter((entry) => entry.action.kind === "reconcile").length, 1);
  assert.equal(f.snapshot().runs[0].state, "recovering"); assert.equal(f.snapshot().runs[1].state, "queued");
  const reconcile = f.engine.claimEffect(["reconcile"]); assert.ok(reconcile); f.engine.finishEffect(reconcile.id);
  f.command({ ...command, commandId: "later" });
  assert.equal(f.store.unfinishedEffects().filter((entry) => entry.action.kind === "reconcile").length, 1);
  assert.equal(f.store.effects().filter((entry) => entry.action.kind === "start").length, 1);
  assert.throws(() => f.command({ ...command, commandId: "wrong-run", runId: "queued" }), /Only uncertain/);
});

test("native request identity remains protected across historical turns and late expired requests require recovery", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const first = f.snapshot().runs[0];
  const request = { id: "request", nativeId: "native-request", runId: first.id, attemptId: first.attemptId,
    kind: "approval" as const, status: "pending" as const, title: "Run?", createdAt: "2026-10-21T10:00:00.000Z",
    expiresAt: "2026-10-21T10:01:00.000Z", options: [{ id: "allow", label: "Allow once" }] };
  f.engine.accept({ kind: "request", eventId: "ask", conversationId: "conversation", runId: first.id, attemptId: first.attemptId, request });
  f.update({ kind: "finished", eventId: "finished", status: "completed", failure: null, usage: null });
  f.submit("next"); const next = f.snapshot().runs[1];
  assert.throws(() => f.engine.accept({ kind: "request", eventId: "reuse", conversationId: "conversation", runId: next.id, attemptId: next.attemptId,
    request: { ...request, runId: next.id, attemptId: next.attemptId } }), /identity cannot be reused/);
  assert.equal(f.store.request("conversation", request.id)?.runId, first.id);
  f.setTime("2026-10-21T10:02:00.000Z");
  f.engine.accept({ kind: "request", eventId: "expired-before-delivery", conversationId: "conversation", runId: next.id, attemptId: next.attemptId,
    request: { ...request, id: "new-but-late", runId: next.id, attemptId: next.attemptId } });
  assert.equal(f.snapshot().runs[1].state, "recovering");
  assert.equal(f.store.request("conversation", "new-but-late")?.status, "expired");
});
