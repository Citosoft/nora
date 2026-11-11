import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createThreadLayoutPersistence } from "@/components/app/logic/thread-workspace/persistence";
import { threadLayoutSchema } from "@/components/app/logic/thread-workspace/schema";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { threadBinding, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ThreadRunState } from "@/components/app/types/thread-workspace/ports.types";

function openDraft(f: ReturnType<typeof threadWorkspaceFixture>, text = "Write a brief") {
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "personal", text });
  assert.ok(id);
  store.setBinding(id, threadBinding);
  return { store, id };
}

test("new views never create native work, and independent drafts survive closing and restart", () => {
  const f = threadWorkspaceFixture();
  const { store, id } = openDraft(f);
  const second = store.openDraft({ workspaceId: "project", text: "Inspect changes" }); assert.ok(second);
  store.setBinding(second, { ...threadBinding, model: "second" });
  store.closeDocument(second);
  assert.equal(store.snapshot().layout.documents.length, 2);
  assert.equal(f.commands.length, 0);
  const restored = createThreadWorkspaceStore(f.deps);
  assert.equal(restored.snapshot().layout.documents[0].text, "Write a brief");
  assert.equal(restored.snapshot().layout.documents[1].provider?.model, "second");
  assert.equal(restored.snapshot().layout.openIds.includes(second), false);
  restored.focusDocument(second);
  assert.equal(restored.snapshot().layout.activeId, second);
  restored.focusDocument(id);
  assert.equal(restored.snapshot().layout.focusedWorkspaceId, "personal");
});

test("storage failure prevents delivery and can be retried with the saved command identities", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f);
  f.setUnavailable(true); await store.submit(id);
  assert.equal(f.commands.length, 0); assert.ok(store.snapshot().storageError);
  const pending = store.snapshot().layout.documents[0].pending; assert.ok(pending);
  f.setUnavailable(false); await store.submit(id);
  assert.equal(f.commands[1].commandId, pending.submit.commandId);
  assert.equal(store.snapshot().layout.documents[0].target.kind, "thread");
  assert.equal(store.snapshot().layout.activeId, id);
  assert.equal(store.snapshot().storageError, null);
});

test("uncertain delivery survives restart and retries once without duplicate native creation or turns", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f);
  f.loseNextReply(); await store.submit(id);
  assert.match(store.snapshot().runtime[id].error ?? "", /Reply lost/);
  await store.refresh();
  const rows = buildThreadNavigation(store.snapshot(), "personal", "all");
  assert.equal(rows.length, 2, "existing thread plus one recoverable draft");
  const pending = store.snapshot().layout.documents[0].pending; assert.ok(pending);
  assert.equal(store.openThread(pending.submit.conversationId), id);
  const restored = createThreadWorkspaceStore(f.deps);
  assert.equal(restored.snapshot().runtime[id], undefined, "model discovery readiness is never persisted");
  await restored.submit(id);
  assert.deepEqual(f.commands.slice(0, 2), f.commands.slice(2));
  assert.equal(f.acceptedCount, 2);
  assert.equal(restored.snapshot().layout.documents[0].pending, null);
  assert.equal(restored.snapshot().layout.documents[0].text, "");
});

test("catalog readiness can clear without erasing preferences, and failed readiness cannot send", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f);
  store.setBinding(id, null);
  assert.deepEqual(store.snapshot().layout.documents[0].provider, threadBinding);
  await store.submit(id); assert.equal(f.commands.length, 0);
  store.setBinding(id, threadBinding); await store.submit(id); assert.equal(f.commands.length, 2);
});

test("workspace selection re-evaluates a draft role but existing threads preserve their captured role", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f);
  store.selectWorkspace(id, "project");
  assert.equal(store.snapshot().layout.focusedWorkspaceId, "project");
  assert.equal(store.snapshot().layout.documents[0].text, "Write a brief");
  assert.equal(store.snapshot().runtime[id].readyBinding, null);
  await store.refresh(); const existing = store.openThread("existing"); assert.ok(existing);
  store.updateBoot({ ...f.deps.boot, personalization: { defaultRole: { id: "research" }, workspaceRoles: { project: { id: "developer" } } } });
  assert.equal(store.snapshot().layout.documents.find((d) => d.id === id)?.role?.id, "developer");
  assert.equal(store.snapshot().layout.documents.find((d) => d.id === existing)?.role?.id, "writing");
  store.selectWorkspace(existing, "project");
  assert.equal(store.snapshot().layout.documents.find((d) => d.id === existing)?.workspaceId, "personal");
});

test("closing views and disposing subscriptions never interrupt work; commands cannot address another thread", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const stop = store.start(); await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  await store.execute(id, { kind: "archive", commandId: "wrong", conversationId: "other" });
  store.closeDocument(id); stop(); stop();
  assert.equal(f.commands.length, 0); assert.equal(f.listeners.size, 0);
  store.focusDocument(id);
  await store.execute(id, { kind: "archive", commandId: "right", conversationId: "existing" });
  assert.equal(f.commands.length, 1);
});

test("corrupt and wrong-host view state is preserved and blocks native submissions", async () => {
  const f = threadWorkspaceFixture(); let raw = '{"broken":true}';
  const persistence = createThreadLayoutPersistence({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }, "local");
  const store = createThreadWorkspaceStore({ ...f.deps, persistence });
  const id = store.openDraft({ workspaceId: "personal", text: "Keep this" }); assert.ok(id);
  store.setBinding(id, threadBinding); await store.submit(id);
  assert.equal(raw, '{"broken":true}'); assert.equal(f.commands.length, 0);
  assert.ok(store.snapshot().storageError);
  assert.throws(() => persistence.write({ version: 1, environmentId: "remote", focusedWorkspaceId: null, activeId: null, documents: [], openIds: [], pinnedThreadIds: [] }), /another execution host/);
});

test("saved layouts reject duplicate thread identities and inconsistent pending ownership", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f); f.loseNextReply(); await store.submit(id);
  const layout = store.snapshot().layout;
  assert.equal(threadLayoutSchema.safeParse({ ...layout, documents: [...layout.documents, { ...layout.documents[0], id: "another" }] }).success, false);
  assert.equal(threadLayoutSchema.safeParse({ ...layout, environmentId: "remote" }).success, false);
});

test("navigation filters native attention, queue and settled state and pins by meaningful activity", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const archived = structuredClone(f.summaries[0]); archived.conversation.id = "archived"; archived.conversation.archivedAt = "2026-11-09T12:00:00.000Z";
  f.summaries.push(archived); f.summaries[0].queuedCount = 2; f.summaries[0].conversation.queuePaused = true;
  await store.refresh(); store.togglePin("existing");
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "attention")[0].status, "Queue paused");
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "active")[0].queuedCount, 2);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all")[0].pinned, true);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "settled")[0].id, "archived");
});

test("navigation shows work only for executing runs, including closed threads", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const draftId = store.openDraft({ workspaceId: "personal", text: "Unsent draft" });
  const states: readonly ThreadRunState[] = ["queued", "starting", "running", "awaiting-approval", "awaiting-input", "stopping", "completed", "failed", "interrupted", "recovering"];
  for (const state of states) {
    f.summaries[0].latestRun = { id: "run", state, createdAt: "2026-11-09T10:00:00.000Z", updatedAt: "2026-11-09T10:00:00.000Z", failure: null };
    await store.refresh();
    const rows = buildThreadNavigation(store.snapshot(), "personal", "all");
    assert.equal(rows.find((row) => row.id === "existing")?.working, ["starting", "running", "stopping"].includes(state), state);
    assert.equal(rows.find((row) => row.id === draftId)?.working, false);
  }
  assert.ok(f.summaries[0].latestRun);
  f.summaries[0].latestRun.state = "running";
  f.summaries[0].pendingRequestCount = 1;
  await store.refresh();
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all").find((row) => row.id === "existing")?.working, false);
  f.summaries[0].latestRun = null;
  f.summaries[0].pendingRequestCount = 0;
  f.summaries[0].queuedCount = 2;
  await store.refresh();
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all").find((row) => row.id === "existing")?.working, false);
});

test("summary refreshes reject stale replies and token events do not reorder thread navigation", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const stop = store.start();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const initialReads = f.summaryReads;
  const listener = [...f.listeners][0]; assert.ok(listener);
  listener.onEvent({ schemaVersion: 1, id: "event", conversationId: "existing", cursor: 1, at: "2026-11-09T11:00:00.000Z",
    payload: { kind: "item", item: { id: "message", runId: "run", kind: "message", role: "assistant", text: "Streaming", complete: false, createdAt: "2026-11-09T11:00:00.000Z" } } });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(f.summaryReads, initialReads);
  listener.onEvent({ schemaVersion: 1, id: "changed", conversationId: "existing", cursor: 2, at: "2026-11-09T11:00:00.000Z",
    payload: { kind: "conversation", conversation: f.summaries[0].conversation } });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(f.summaryReads, initialReads + 1); stop();

  let release: (rows: typeof f.summaries) => void = () => { throw new Error("Deferred read was not initialized"); };
  const delayed = new Promise<typeof f.summaries>((resolve) => { release = resolve; });
  let reads = 0;
  const ordered = createThreadWorkspaceStore({ ...f.deps, client: { ...f.deps.client,
    summaries: () => ++reads === 1 ? delayed : Promise.resolve([]) } });
  const first = ordered.refresh(); await ordered.refresh();
  release(f.summaries); await first;
  assert.deepEqual(ordered.snapshot().summaries, []);
});

test("unread completions track background outcomes and clear only when viewed", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const update = async (state: ThreadRunState, id = "run") => {
    f.summaries[0].latestRun = { id, state, createdAt: "2026-11-09T10:00:00.000Z", updatedAt: "2026-11-09T11:00:00.000Z", failure: null };
    await store.refresh();
  };
  await update("completed", "old");
  assert.deepEqual(store.snapshot().unreadThreadIds, [], "restored history is read");
  await update("running");
  await update("completed");
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "attention")[0].unread, true);
  await store.refresh();
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"], "refresh retains unread state");
  const id = store.openThread("existing"); assert.ok(id);
  assert.deepEqual(store.snapshot().unreadThreadIds, []);
  await update("running", "second");
  await update("completed", "second");
  assert.deepEqual(store.snapshot().unreadThreadIds, [], "visible completion is read");
  store.setWindowFocused(false);
  await update("failed", "third");
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"], "unfocused window retains unread outcome");
  store.setWindowFocused(true);
  assert.deepEqual(store.snapshot().unreadThreadIds, []);
  store.setThreadVisible(false);
  await update("interrupted", "fourth");
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"], "workspace tools hide the selected thread");
  store.setThreadVisible(true);
  assert.deepEqual(store.snapshot().unreadThreadIds, []);
  store.closeDocument(id);
  await update("completed", "fifth");
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"], "closed threads still notify");
  store.focusDocument(id);
  assert.deepEqual(store.snapshot().unreadThreadIds, []);
  await store.refresh();
  assert.deepEqual(store.snapshot().unreadThreadIds, [], "read outcomes do not reappear");
});
