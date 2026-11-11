import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { canSettleThread } from "@/components/app/logic/thread-workspace/settlement";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

test("settling hides a thread and closes its views while retaining drafts and pins, and reopening restores it", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  store.setText(id, "Keep this unsent draft"); store.togglePin("existing");
  await store.setSettled({ kind: "thread", conversationId: "existing" }, true);
  assert.equal(store.snapshot().layout.openIds.includes(id), false);
  assert.equal(store.snapshot().layout.documents.find((document) => document.id === id)?.text, "Keep this unsent draft");
  assert.deepEqual(store.snapshot().layout.pinnedThreadIds, ["existing"]);
  assert.equal(buildThreadNavigation(store.snapshot(), null, "all").length, 0);
  const hidden = buildThreadNavigation(store.snapshot(), null, "settled");
  assert.equal(hidden.length, 1); assert.equal(hidden[0].status, "Settled");
  await store.setSettled({ kind: "thread", conversationId: "existing" }, false);
  assert.equal(buildThreadNavigation(store.snapshot(), null, "settled").length, 0);
  assert.equal(buildThreadNavigation(store.snapshot(), null, "all").length, 1);
  assert.equal(store.openThread("existing"), id);
  assert.equal(store.snapshot().layout.documents.find((document) => document.id === id)?.text, "Keep this unsent draft");
  assert.deepEqual(f.commands.map((command) => command.kind), ["archive", "unarchive"]);
});

test("an external thread can be settled without opening a chat or submitting an instruction", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  const entry: ExternalSessionEntry = { workspaceId: "personal", workspaceName: "Personal", workspacePath: "/personal", session: {
    origin: "desktop", id: "native-external", title: "Other chat", providerKind: "codex", instanceId: "account", cwd: "/personal", createdAt: f.deps.now(), updatedAt: f.deps.now()
  } };
  const original = f.deps.client.execute;
  f.deps.client.execute = async (command) => {
    const receipt = await original(command);
    if (command.kind === "create" && command.externalSessionId) {
      const summary = f.summaries.find((summary) => summary.conversation.id === receipt.conversationId);
      if (summary) summary.conversation = { ...summary.conversation, origin: entry.session.origin, nativeConversationId: entry.session.id };
    }
    return receipt;
  };
  await store.setSettled({ kind: "external", entry }, true);
  assert.deepEqual(f.commands.map((command) => command.kind), ["create", "archive"]);
  assert.equal(store.snapshot().layout.openIds.length, 0);
  const settled = buildThreadNavigation(store.snapshot(), null, "settled");
  assert.equal(settled.length, 1); assert.equal(settled[0].title, entry.session.title);
});

test("failed settlement keeps the thread visible and leaves its saved draft open", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  f.deps.client.execute = async () => { throw new Error("Thread is still working"); };
  await assert.rejects(store.setSettled({ kind: "thread", conversationId: "existing" }, true), /still working/);
  assert.ok(store.snapshot().layout.openIds.includes(id));
  const row = buildThreadNavigation(store.snapshot(), null, "all")[0]; assert.ok(row);
  assert.equal(canSettleThread(row), true);
  assert.equal(canSettleThread({ ...row, active: true }), false);
  assert.equal(canSettleThread({ ...row, queuedCount: 1 }), false);
});
