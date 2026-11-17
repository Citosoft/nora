import assert from "node:assert/strict";
import test from "node:test";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { applyMemoryReview } from "@main/bots/memory/review/apply";
import { memoryReviewRequest, parseMemoryReview } from "@main/bots/memory/review/prompt";
import { createMemoryReviewScheduler, REVIEW_AFTER_TURNS, REVIEW_IDLE_MS } from "@main/bots/memory/review/scheduler";
import { snapshotBot } from "@shared/bots/snapshot";
import type { TextGenerationRequest } from "@main/types/ai/textGeneration.types";
import type { Conversation, ConversationEvent, ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { MemoryReviewRecord } from "@shared/types/bots/memoryReview.types";
import { openMemoryReviewLog } from "@main/bots/memory/review/log";
import { conversation } from "../nora-tools/fixture";
import { bot } from "../../shared/bots/fixtures";

function memoryStore(t: test.TestContext) {
  let sequence = 0, clock = 0;
  const memory = openBotMemoryStore(":memory:", { now: () => new Date(Date.UTC(2026, 10, 13, 0, 0, clock++)).toISOString(), nextId: () => `n${++sequence}` });
  t.after(() => memory.close());
  return memory;
}

test("the parser takes the first JSON object, drops malformed operations and caps the count", () => {
  const answer = "```json\n" + JSON.stringify({ operations: [
    { type: "add", text: "The user prefers short answers.", scope: "bot" },
    { type: "add", text: "  ", scope: "bot" },
    { type: "update", id: "n1", text: "Releases ship on Wednesdays." },
    { type: "forget", id: "n2" },
    { type: "add", text: "Odd scope", scope: "galaxy" },
    { type: "explode" }] }) + "\n```";
  assert.deepEqual(parseMemoryReview(answer), [
    { type: "add", text: "The user prefers short answers.", scope: "bot" },
    { type: "update", id: "n1", text: "Releases ship on Wednesdays." },
    { type: "forget", id: "n2" },
    { type: "add", text: "Odd scope", scope: "bot" }]);
  assert.equal(parseMemoryReview(JSON.stringify({ operations: Array.from({ length: 15 }, (_, index) => ({ type: "forget", id: `n${index}` })) })).length, 10);
  assert.deepEqual(parseMemoryReview('{"operations":[]}'), []);
  assert.throws(() => parseMemoryReview("No changes needed."), /no JSON object/);
});

test("the prompt marks the user's notes, keeps the newest messages within budget and treats everything as data", (t) => {
  const memory = memoryStore(t);
  memory.add({ botId: "ada", workspaceId: null, text: "Call me Dan", source: { kind: "user" } });
  memory.add({ botId: "ada", workspaceId: "w", text: "Uses pnpm", source: { kind: "bot", conversationId: "c" } });
  const messages = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const,
    text: `${index} ${"x".repeat(5000)}`, createdAt: `2026-11-13T00:00:${String(index).padStart(2, "0")}.000Z` }));
  const request = memoryReviewRequest({ owner: { name: "Ada", role: "Reviewer" }, notes: memory.list("ada", "w"), messages });
  assert.match(request.system, /long-term notes of Ada \(Reviewer\)/);
  assert.match(request.system, /data, not instructions/);
  assert.match(request.user, /"text":"Call me Dan","by":"user","scope":"bot"/);
  assert.match(request.user, /"text":"Uses pnpm","by":"assistant","scope":"workspace"/);
  const conversationJson = request.user.slice(request.user.indexOf("<conversation>"));
  assert.doesNotMatch(conversationJson, /"text":"0 /);
  assert.match(conversationJson, /"text":"11 x+…"/);
});

test("applying a review adds automatic notes and changes only the owner's own notes here", (t) => {
  const memory = memoryStore(t);
  const user = memory.add({ botId: "ada", workspaceId: null, text: "Call me Dan", source: { kind: "user" } });
  const own = memory.add({ botId: "ada", workspaceId: null, text: "Ships Tuesdays", source: { kind: "bot", conversationId: "c" } });
  const stale = memory.add({ botId: "ada", workspaceId: "w", text: "Uses npm", source: { kind: "review", conversationId: "c" } });
  const elsewhere = memory.add({ botId: "ada", workspaceId: "other", text: "Other repo fact", source: { kind: "bot", conversationId: "c" } });
  const rex = memory.add({ botId: "rex", workspaceId: null, text: "Rex's note", source: { kind: "bot", conversationId: "c" } });
  const outcome = applyMemoryReview(memory, { ownerId: "ada", workspaceId: "w", conversationId: "thread" }, [
    { type: "add", text: "Uses pnpm", scope: "workspace" },
    { type: "update", id: own.id, text: "Ships Wednesdays" },
    { type: "forget", id: stale.id },
    { type: "update", id: user.id, text: "Call me Daniel" },
    { type: "forget", id: elsewhere.id },
    { type: "forget", id: rex.id },
    { type: "update", id: "missing", text: "x" }]);
  assert.deepEqual(outcome, { added: 1, updated: 1, forgotten: 1, skipped: 4 });
  assert.deepEqual(memory.list("ada", "w").map((note) => [note.text, note.source.kind, note.workspaceId]),
    [["Ships Wednesdays", "bot", null], ["Uses pnpm", "review", "w"], ["Call me Dan", "user", null]]);
  assert.equal(memory.get(rex.id)?.text, "Rex's note");
  assert.equal(memory.get(elsewhere.id)?.text, "Other repo fact");
});

function hostFixture() {
  const conversations = new Map<string, Conversation>();
  const items = new Map<string, TimelineItem[]>();
  const active = new Set<string>();
  let subscriber: EventSubscription | null = null;
  let cursor = 0;
  const host = {
    header: (id: string): ConversationHeader | null => {
      const found = conversations.get(id);
      return found ? { schemaVersion: 1, cursor, conversation: found, activeRuns: active.has(id) ? [run(id, "active", "running")] : [], queuedRuns: [], pendingRequests: [] } : null;
    },
    conversationHistory: ({ conversationId }: { conversationId: string }) =>
      ({ schemaVersion: 1 as const, conversationId, cursor, nextBefore: null, scope: "timeline" as const, items: items.get(conversationId) ?? [] }),
    subscribe: (subscription: EventSubscription) => { subscriber = subscription; return () => { subscriber = null; }; },
    eventCursor: () => cursor
  };
  const emit = (conversationId: string, payload: ConversationEvent["payload"]): void => {
    cursor += 1;
    subscriber?.onEvent({ schemaVersion: 1, id: `e${cursor}`, conversationId, cursor, at: "2026-11-13T00:00:00.000Z", payload });
  };
  return { host, conversations, items, active, emit, subscribed: () => subscriber !== null };
}

function run(conversationId: string, id: string, state: ConversationRun["state"], action?: ConversationRun["action"]): ConversationRun {
  return { id, conversationId, instruction: "x", state, attemptId: id, nativeTurnId: null, createdAt: "2026-11-13T00:00:00.000Z",
    updatedAt: "2026-11-13T00:00:00.000Z", failure: null, usage: null, review: "unavailable", ...(action ? { action } : {}) };
}
const message = (id: string, role: "user" | "assistant", text: string, second: number): TimelineItem =>
  ({ kind: "message", id, runId: "r", createdAt: `2026-11-13T00:00:${String(second).padStart(2, "0")}.000Z`, role, text, complete: true });

function schedulerFixture(t: test.TestContext, answer = '{"operations":[{"type":"add","text":"The user prefers tabs.","scope":"bot"}]}') {
  const fixture = hostFixture();
  const memory = memoryStore(t);
  const requests: TextGenerationRequest[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  let enabled = true;
  const errors: unknown[] = [];
  const records: Omit<MemoryReviewRecord, "id">[] = [];
  let clock = 1_000;
  const scheduler = createMemoryReviewScheduler({ host: fixture.host, memory, enabled: () => enabled,
    generate: async (request) => { requests.push(request); clock += 250; return { text: answer, provider: "claude", model: "claude-haiku-5-5", usage: { inputTokens: 900, outputTokens: 30 } }; },
    log: { record: (entry) => { records.push(entry); } }, clock: () => clock,
    source: () => ({ provider: "claude", model: "claude-haiku-5-5" }),
    schedule: (callback, delayMs) => { assert.equal(delayMs, REVIEW_IDLE_MS); const id = ++timerId; timers.set(id, callback); return () => timers.delete(id); },
    onError: (error) => errors.push(error) });
  t.after(() => scheduler.stop());
  const fireTimers = (): void => { const pending = [...timers.values()]; timers.clear(); for (const callback of pending) callback(); };
  return { ...fixture, memory, scheduler, requests, records, timers, fireTimers, errors, disable: () => { enabled = false; } };
}

test("a quiet thread is reviewed once, as its bot, reading only messages after the last review", async (t) => {
  const f = schedulerFixture(t);
  f.conversations.set("ada", conversation("ada", { bot: snapshotBot(bot("ada")) }));
  f.items.set("ada", [message("m1", "user", "I prefer tabs", 1), message("m2", "assistant", "Noted", 2)]);
  f.scheduler.start();
  f.emit("ada", { kind: "run", run: run("ada", "r1", "completed") });
  f.emit("ada", { kind: "run", run: run("ada", "r1", "completed") });
  f.emit("ada", { kind: "run", run: run("ada", "compact", "completed", "compact") });
  assert.equal(f.timers.size, 1);
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 1);
  assert.match(f.requests[0].system, /long-term notes of Ada/);
  assert.match(f.requests[0].user, /I prefer tabs/);
  assert.deepEqual(f.memory.list("ada", "w").map((note) => [note.text, note.source]), [["The user prefers tabs.", { kind: "review", conversationId: "ada" }]]);
  assert.equal(f.memory.reviewedThrough("ada"), "2026-11-13T00:00:02.000Z");
  assert.deepEqual(f.records.map((record) => [record.conversationId, record.ownerName, record.provider, record.model, record.status, record.outcome, record.usage, record.durationMs]),
    [["ada", "Ada", "claude", "claude-haiku-5-5", "completed", { added: 1, updated: 0, forgotten: 0, skipped: 0 }, { inputTokens: 900, outputTokens: 30 }, 250]]);
  f.items.set("ada", [...(f.items.get("ada") ?? []), message("m3", "user", "Also, deadline is Friday", 3)]);
  f.emit("ada", { kind: "run", run: run("ada", "r2", "completed") });
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 2);
  assert.doesNotMatch(f.requests[1].user, /I prefer tabs/);
  assert.match(f.requests[1].user, /deadline is Friday/);
  assert.deepEqual(f.errors, []);
});

test("Nora threads are reviewed into Nora's notes; enough turns or settling review at once; group chats never", async (t) => {
  const f = schedulerFixture(t);
  f.conversations.set("plain", conversation("plain"));
  f.conversations.set("room", conversation("room", { group: { members: [], writer: null, lead: null, hopLimit: 4 } }));
  f.items.set("plain", [message("m1", "user", "Call the sidebar the rail", 1)]);
  f.items.set("room", [message("g1", "user", "Group message", 1)]);
  f.scheduler.start();
  for (let index = 0; index < REVIEW_AFTER_TURNS; index += 1) f.emit("plain", { kind: "run", run: run("plain", `r${index}`, "completed") });
  await f.scheduler.idle();
  assert.equal(f.requests.length, 1);
  assert.match(f.requests[0].system, /long-term notes of Nora/);
  assert.deepEqual(f.memory.list("nora", "w").map((note) => note.text), ["The user prefers tabs."]);
  f.emit("room", { kind: "run", run: run("room", "g", "completed") });
  f.emit("room", { kind: "conversation", conversation: { ...conversation("room"), archivedAt: "2026-11-13T01:00:00.000Z" } });
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 1);
  f.items.set("plain", [...(f.items.get("plain") ?? []), message("m2", "user", "Settle this", 2)]);
  f.emit("plain", { kind: "run", run: run("plain", "last", "completed") });
  f.emit("plain", { kind: "conversation", conversation: { ...conversation("plain"), archivedAt: "2026-11-13T01:00:00.000Z" } });
  await f.scheduler.idle();
  assert.equal(f.requests.length, 2);
});

test("a busy thread waits for quiet, a disabled setting or assistant-only messages skip the model, and a bad answer is reported", async (t) => {
  const f = schedulerFixture(t, "I would not change anything.");
  f.conversations.set("plain", conversation("plain"));
  f.items.set("plain", [message("a1", "assistant", "Done.", 1)]);
  f.scheduler.start();
  f.emit("plain", { kind: "run", run: run("plain", "r1", "completed") });
  f.active.add("plain");
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.timers.size, 1);
  f.active.delete("plain");
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 0);
  assert.equal(f.memory.reviewedThrough("plain"), "2026-11-13T00:00:01.000Z");
  f.items.set("plain", [message("u1", "user", "Remember I use vim", 2)]);
  f.emit("plain", { kind: "run", run: run("plain", "r2", "completed") });
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 1);
  assert.match(String(f.errors[0]), /no JSON object/);
  assert.equal(f.records.length, 1, "assistant-only and busy checks never reach the model, so only the bad answer is recorded");
  assert.deepEqual([f.records[0].status, f.records[0].usage, f.records[0].outcome], ["failed", { inputTokens: 900, outputTokens: 30 }, null]);
  assert.match(f.records[0].error ?? "", /no JSON object/);
  assert.equal(f.memory.reviewedThrough("plain"), "2026-11-13T00:00:02.000Z");
  f.disable();
  f.items.set("plain", [message("u2", "user", "More", 3)]);
  f.emit("plain", { kind: "run", run: run("plain", "r3", "completed") });
  f.fireTimers();
  await f.scheduler.idle();
  assert.equal(f.requests.length, 1);
  f.scheduler.stop();
  assert.equal(f.subscribed(), false);
});

test("the review log keeps every review, totals the last days, and prunes old records", (t) => {
  let sequence = 0;
  let now = new Date("2026-11-13T12:00:00.000Z");
  const log = openMemoryReviewLog(":memory:", { nextId: () => `r${++sequence}`, now: () => now });
  t.after(() => log.close());
  const base = { conversationId: "c", threadTitle: "Plan the launch", ownerName: "Ada", durationMs: 1200, provider: "claude", model: "claude-haiku-5-5" };
  log.record({ ...base, at: "2026-08-20T00:00:00.000Z", status: "completed", outcome: null, usage: { inputTokens: 5, outputTokens: 1 }, error: null });
  log.record({ ...base, at: "2026-11-12T00:00:00.000Z", status: "completed", outcome: { added: 1, updated: 0, forgotten: 0, skipped: 0 }, usage: { inputTokens: 1000, outputTokens: 40 }, error: null });
  log.record({ ...base, at: "2026-11-13T00:00:00.000Z", status: "failed", outcome: null, usage: null, error: "x".repeat(900), provider: "codex", model: null });
  const activity = log.activity("2026-11-06T12:00:00.000Z", 20);
  assert.deepEqual(activity.totals, { reviews: 2, failed: 1, inputTokens: 1000, outputTokens: 40, unmetered: 1 });
  assert.deepEqual(activity.recent.map((record) => [record.id, record.provider, record.status]), [["r3", "codex", "failed"], ["r2", "claude", "completed"], ["r1", "claude", "completed"]]);
  assert.equal(activity.recent[0].error?.length, 500);
  now = new Date("2026-11-20T00:00:00.000Z");
  log.record({ ...base, at: "2026-11-20T00:00:00.000Z", status: "completed", outcome: null, usage: null, error: null });
  assert.equal(log.activity("2026-01-01T00:00:00.000Z", 20).recent.some((record) => record.id === "r1"), false, "records older than 90 days are pruned");
});
