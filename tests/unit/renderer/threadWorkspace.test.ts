import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createThreadLayoutPersistence } from "@/components/app/logic/thread-workspace/persistence";
import { threadLayoutSchema } from "@/components/app/logic/thread-workspace/schema";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { threadBinding, threadSummary, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ThreadRunState } from "@/components/app/types/thread-workspace/ports.types";

function openDraft(f: ReturnType<typeof threadWorkspaceFixture>, text = "Write a brief") {
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "personal", text });
  assert.ok(id);
  store.setBinding(id, threadBinding, "chosen");
  return { store, id };
}

test("new views never create native work, and independent drafts survive closing and restart", () => {
  const f = threadWorkspaceFixture();
  const { store, id } = openDraft(f);
  const second = store.openDraft({ workspaceId: "project", text: "Inspect changes" }); assert.ok(second);
  store.setBinding(second, { ...threadBinding, model: "second" }, "chosen");
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
  store.setBinding(id, null, "chosen");
  assert.deepEqual(store.snapshot().layout.documents[0].provider, threadBinding);
  await store.submit(id); assert.equal(f.commands.length, 0);
  store.setBinding(id, threadBinding, "chosen"); await store.submit(id); assert.equal(f.commands.length, 2);
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
  store.setBinding(id, threadBinding, "chosen"); await store.submit(id);
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

test("navigation hides app builder drafts while Apps can still open them", () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const ordinary = store.openDraft({ workspaceId: "personal", text: "Regular draft" });
  for (const appId of [null, "app-id"]) {
    const builder = store.openDraft({ workspaceId: "personal", text: "Build an app", source: { kind: "app", appId } });
    assert.ok(builder);
    assert.ok(store.snapshot().layout.documents.some((entry) => entry.id === builder));
  }
  for (const scope of ["personal", null]) {
    assert.deepEqual(buildThreadNavigation(store.snapshot(), scope, "all").map((row) => row.id), [ordinary]);
  }
});

test("navigation hides saved app builder threads across scopes and filters without preventing opening them", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const builder = threadSummary("builder");
  builder.conversation.source = { kind: "app", appId: "app-id" };
  builder.latestRun = { id: "build-run", state: "awaiting-input", createdAt: builder.conversation.createdAt,
    updatedAt: builder.conversation.updatedAt, failure: null };
  builder.pendingRequestCount = 1;
  f.summaries.push(builder);
  for (const archivedAt of [null, "2026-11-09T11:00:00.000Z"]) {
    builder.conversation.archivedAt = archivedAt;
    await store.refresh();
    for (const scope of ["personal", null]) {
      for (const filter of ["all", "active", "attention", "settled"] as const) {
        assert.equal(buildThreadNavigation(store.snapshot(), scope, filter).some((row) => row.id === "builder"), false);
      }
    }
  }
  assert.ok(buildThreadNavigation(store.snapshot(), "personal", "all").some((row) => row.id === "existing"));
  assert.ok(store.openThread("builder"));
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

test("unread dots come from the inbox, and a thread is read once it is on screen in a focused window", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const stop = store.start();
  await store.refresh();
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  f.unread.set(["existing"]);
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"]);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "attention")[0].unread, true);
  store.setWindowFocused(false);
  const id = store.openThread("existing"); assert.ok(id);
  await settle();
  assert.deepEqual(f.unread.read, [], "an unfocused window does not read the thread");
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"]);
  store.setThreadVisible(false);
  store.setWindowFocused(true);
  await settle();
  assert.deepEqual(f.unread.read, [], "workspace tools hide the selected thread");
  store.setThreadVisible(true);
  assert.deepEqual(store.snapshot().unreadThreadIds, [], "the thread on screen never shows as unread");
  await settle();
  assert.deepEqual(f.unread.read, ["existing"]);
  assert.deepEqual(f.unread.unreadThreadIds(), []);
  store.closeDocument(id);
  f.unread.set(["existing"]);
  assert.deepEqual(store.snapshot().unreadThreadIds, ["existing"], "closed threads still show new updates");
  stop();
});

test("compacting a thread queues a compaction run, while generic execute still refuses instructions", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  await store.execute(id, { kind: "submit", commandId: "bypass", conversationId: "existing", runId: "bypass-run", instruction: "Compact context", action: "compact" });
  assert.equal(f.commands.length, 0);
  await store.compact(id);
  assert.equal(f.commands.length, 1);
  const command = f.commands[0];
  assert.equal(command.kind, "submit");
  if (command.kind === "submit") {
    assert.equal(command.conversationId, "existing"); assert.equal(command.action, "compact"); assert.equal(command.instruction, "Compact context");
  }
  assert.equal(store.snapshot().runtime[id]?.busy, false);
  const draft = store.openDraft({ workspaceId: "personal" }); assert.ok(draft);
  await store.compact(draft);
  assert.equal(f.commands.length, 1);
});

test("an inherited default binding can send but is not saved, so a reused empty draft keeps following the default", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "personal" }); assert.ok(id);
  store.setBinding(id, threadBinding, "inherited");
  assert.equal(store.snapshot().layout.documents[0].provider, null);
  assert.equal(store.snapshot().runtime[id].readyBinding, threadBinding);
  assert.equal(store.openDraft({ workspaceId: "personal" }), id, "New thread reuses the empty draft");
  assert.equal(store.snapshot().layout.documents[0].provider, null);
  store.setBinding(id, threadBinding, "chosen");
  assert.deepEqual(store.snapshot().layout.documents[0].provider, threadBinding);
});

test("closing an empty draft discards it; drafts with content stay until discarded", () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const empty = store.openDraft({ workspaceId: "personal" }); assert.ok(empty);
  const emptyRow = buildThreadNavigation(store.snapshot(), "personal", "all").find((row) => row.id === empty);
  assert.equal(emptyRow?.hasDraft, false, "an empty draft has nothing to confirm");
  store.closeDocument(empty);
  assert.equal(store.snapshot().layout.documents.some((entry) => entry.id === empty), false);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all").some((row) => row.id === empty), false, "it leaves the thread list");

  const written = store.openDraft({ workspaceId: "personal", text: "Keep me" }); assert.ok(written);
  store.closeDocument(written);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all").find((row) => row.id === written)?.hasDraft, true);
  store.discardDraft(written);
  assert.deepEqual(store.snapshot().layout.documents, []);
  assert.equal(createThreadWorkspaceStore(f.deps).snapshot().layout.documents.length, 0, "discarding is saved");
  assert.equal(f.commands.length, 0, "drafts never reached the runtime");
});

test("a draft whose delivery is unconfirmed cannot be discarded or dropped by closing it", async () => {
  const f = threadWorkspaceFixture(); const { store, id } = openDraft(f);
  f.setUnavailable(true); await store.submit(id);
  assert.ok(store.snapshot().layout.documents[0].pending);
  store.discardDraft(id);
  assert.equal(store.snapshot().layout.documents.length, 1);
  assert.match(store.snapshot().runtime[id]?.error ?? "", /Confirm delivery/);
  store.closeDocument(id);
  assert.equal(store.snapshot().layout.documents.length, 1);
});


test("typing preserves unrelated tabs and nested draft identities through validated saves", () => {
  const f = threadWorkspaceFixture();
  const { store, id } = openDraft(f);
  const otherId = store.openDraft({ workspaceId: "project", text: "Other draft" });
  assert.ok(otherId);
  const before = store.snapshot();
  const original = before.layout.documents.find((entry) => entry.id === id)!;
  const other = before.layout.documents.find((entry) => entry.id === otherId)!;
  store.setText(id, "Updated message");
  const after = store.snapshot();
  const edited = after.layout.documents.find((entry) => entry.id === id)!;
  assert.notEqual(edited, original);
  assert.equal(edited.provider, original.provider);
  assert.equal(edited.target, original.target);
  assert.equal(after.layout.documents.find((entry) => entry.id === otherId), other);
  assert.equal(after.boot, before.boot);
  assert.equal(createThreadWorkspaceStore(f.deps).snapshot().layout.documents.find((entry) => entry.id === id)?.text, "Updated message");
});

test("unchanged text and equivalent ready bindings do not publish workspace updates", () => {
  const f = threadWorkspaceFixture();
  const { store, id } = openDraft(f);
  const before = store.snapshot();
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  store.setText(id, "Write a brief");
  for (let index = 0; index < 100; index++) store.setBinding(id, { ...threadBinding }, index % 2 ? "chosen" : "inherited");
  assert.equal(store.snapshot(), before);
  assert.equal(notifications, 0);
  unsubscribe();
});
