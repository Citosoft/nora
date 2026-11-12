import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { pickerCatalog } from "./modelPickerFixtures";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";

for (const kind of ["codex", "claude"] as const) test(`opening a ${kind} CLI conversation creates its binding and opens the thread without submitting a prompt or changing drafts`, async () => {
  const f = threadWorkspaceFixture();
  f.deps.boot = { ...f.deps.boot, providers: [{ kind, instanceId: "account", label: kind }] };
  f.deps.client.catalog = async () => pickerCatalog(f.deps.boot.providers[0]);
  const store = createThreadWorkspaceStore(f.deps);
  const draft = store.openDraft({ workspaceId: "personal", text: "Keep this draft" });
  const session: ExternalSession = { origin: "cli", id: "native-terminal", providerKind: kind, instanceId: "account", cwd: "/personal", title: "Terminal work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  await store.resumeExternal("personal", session);
  assert.equal(f.commands.length, 1);
  const command = f.commands[0]; assert.equal(command.kind, "create");
  if (command.kind !== "create") return;
  assert.equal(command.externalSessionId, session.id); assert.equal(command.provider.kind, kind);
  assert.equal(command.provider.model, "first");
  assert.equal(store.snapshot().layout.documents.find((document) => document.id === draft)?.text, "Keep this draft");
  const active = store.snapshot().layout.documents.find((document) => document.id === store.snapshot().layout.activeId);
  assert.deepEqual(active?.target, { kind: "thread", conversationId: command.conversationId });
});

test("CLI imports fail locally without creating work when the workspace or catalog is unavailable", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const session: ExternalSession = { origin: "cli", id: "native-terminal", providerKind: "codex", instanceId: "account", cwd: "/personal", title: "Terminal work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  await assert.rejects(store.resumeExternal("removed", session), /workspace is unavailable/);
  f.deps.client.catalog = async () => ({ status: "unavailable", failure: { code: "provider", message: "Provider unavailable", retryable: true } });
  await assert.rejects(store.resumeExternal("personal", session), /Provider unavailable/);
  assert.equal(f.commands.length, 0);
});

test("opening an external conversation opens it on the first click even when a later refresh supersedes the import's read", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const stop = store.start();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const read = f.deps.client.summaries;
  const gates: Array<() => void> = [];
  // Every read waits for the test to release it, so replies can arrive out of order.
  f.deps.client.summaries = async () => { await new Promise<void>((resolve) => { gates.push(resolve); }); return read(); };
  const settle = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));
  const listener = [...f.listeners][0]; assert.ok(listener);
  const session: ExternalSession = { origin: "cli", id: "native-terminal", providerKind: "codex", instanceId: "account", cwd: "/personal", title: "Terminal work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  const opening = store.resumeExternal("personal", session);
  while (gates.length < 1) await settle();
  // The create's events arrive while the import's read is still in flight and schedule a newer read.
  listener.onEvent({ schemaVersion: 1, id: "created", conversationId: f.summaries[1].conversation.id, cursor: 1, at: f.deps.now(),
    payload: { kind: "conversation", conversation: f.summaries[1].conversation } });
  while (gates.length < 2) await settle();
  gates[0](); await settle();
  gates[1]();
  await opening;
  const active = store.snapshot().layout.documents.find((document) => document.id === store.snapshot().layout.activeId);
  assert.deepEqual(active?.target, { kind: "thread", conversationId: f.summaries[1].conversation.id });
  assert.equal(store.snapshot().error, null);
  stop();
});

test("pinning an outside conversation imports and pins it without opening a tab or changing drafts", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const draft = store.openDraft({ workspaceId: "personal", text: "Keep this draft" });
  const before = store.snapshot().layout;
  const session: ExternalSession = { origin: "desktop", id: "native-desktop", providerKind: "codex", instanceId: "account", cwd: "/personal", title: "Desktop work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  await store.pinExternal("personal", session);
  const command = f.commands[0];
  assert.equal(f.commands.length, 1); assert.equal(command.kind, "create");
  if (command.kind !== "create") return;
  assert.equal(command.externalSessionId, session.id);
  const after = store.snapshot();
  assert.deepEqual(after.layout.pinnedThreadIds, [command.conversationId]);
  assert.equal(after.layout.activeId, before.activeId);
  assert.deepEqual(after.layout.documents.map((document) => document.id), before.documents.map((document) => document.id));
  assert.equal(after.layout.documents.find((document) => document.id === draft)?.text, "Keep this draft");
  assert.ok(after.summaries.some((summary) => summary.conversation.id === command.conversationId));
  store.togglePin(command.conversationId);
  assert.deepEqual(store.snapshot().layout.pinnedThreadIds, []);
});
