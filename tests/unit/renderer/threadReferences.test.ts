import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { buildComposerInstruction } from "@/components/app/logic/composerAttachments";
import { threadWorkspaceFixture, threadBinding } from "./threadWorkspaceFixtures";

test("chat references persist independently across drafts and retries send only the saved index reference", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "personal" }); assert.ok(id);
  store.setBinding(id, threadBinding, "chosen");
  await store.addThreadReference(id, "existing");
  await store.addThreadReference(id, "existing");
  const document = store.snapshot().layout.documents.find((entry) => entry.id === id)!;
  assert.equal(document.threadReferences?.length, 1);
  const other = store.openDraft({ workspaceId: "personal" }); assert.notEqual(other, id);
  const restored = createThreadWorkspaceStore(f.deps);
  assert.deepEqual(restored.snapshot().layout.documents.find((entry) => entry.id === id)?.threadReferences, document.threadReferences);
  f.loseNextReply(); await store.submit(id);
  const pending = store.snapshot().layout.documents.find((entry) => entry.id === id)?.pending; assert.ok(pending);
  assert.equal(pending.submit.instruction, buildComposerInstruction("", [], document.threadReferences));
  assert.ok(pending.submit.instruction.includes("/references/existing/index.md"));
  store.removeThreadReference(id, document.threadReferences![0].id);
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.threadReferences?.length, 1);
  await store.submit(id);
  const submissions = f.commands.filter((command) => command.kind === "submit");
  assert.deepEqual(submissions[0], submissions[1]);
  assert.deepEqual(store.snapshot().layout.documents.find((entry) => entry.id === id)?.threadReferences, []);
});

test("references to self or a different execution host cannot enter a draft", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  await store.refresh(); const id = store.openThread("existing"); assert.ok(id);
  await store.addThreadReference(id, "existing");
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.threadReferences?.length ?? 0, 0);
  const read = f.deps.client.reference;
  f.deps.client.reference = async (conversationId) => ({ ...await read(conversationId), environmentId: "other-host" });
  await store.addThreadReference(id, "another");
  assert.match(store.snapshot().runtime[id].error ?? "", /execution host/);
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.threadReferences?.length ?? 0, 0);
});
