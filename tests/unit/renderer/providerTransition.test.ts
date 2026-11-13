import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createDraftIntent } from "@/components/app/logic/nativeDraftIntent";
import { threadWorkspaceFixture, threadBinding, threadBoot } from "./threadWorkspaceFixtures";
import { ConversationAccessError } from "@shared/conversations/errors";

test("existing chat submissions persist the chosen provider transition with the exact retry identity", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  const next = { ...threadBinding, model: "second" };
  store.setBinding(id, next, "chosen"); store.setText(id, "Continue");
  f.loseNextReply(); await store.submit(id);
  const pending = store.snapshot().layout.documents.find((entry) => entry.id === id)?.pending; assert.ok(pending);
  assert.deepEqual(pending.submit.providerChange, { expected: threadBinding, next });
  const restored = createThreadWorkspaceStore(f.deps); await restored.submit(id);
  const sent = f.commands.filter((command) => command.kind === "submit");
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(restored.snapshot().layout.documents.find((entry) => entry.id === id)?.pending, null);
});

test("unchanged provider settings and new chats do not generate handoffs", () => {
  let id = 0;
  const input = { conversationId: "existing", provider: threadBinding, currentProvider: { ...threadBinding }, role: { id: "general" as const }, botId: null, text: "Continue", workspace: threadBoot.workspaces[0] };
  assert.equal(createDraftIntent(input, () => `${++id}`).submit.providerChange, undefined);
  assert.equal(createDraftIntent({ ...input, conversationId: null, provider: { ...threadBinding, model: "second" } }, () => `${++id}`).submit.providerChange, undefined);
});

test("a confirmed provider-change rejection keeps the draft editable rather than locking it into a retry", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps); await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  f.deps.client.execute = async () => { throw new ConversationAccessError({ code: "invalid", message: "Choose another model" }); };
  store.setBinding(id, { ...threadBinding, model: "removed" }, "chosen"); store.setText(id, "Continue");
  await store.submit(id);
  const document = store.snapshot().layout.documents.find((entry) => entry.id === id); assert.ok(document);
  assert.equal(document.pending, null); assert.equal(document.text, "Continue");
  store.setBinding(id, threadBinding, "chosen"); store.setText(id, "Revised instruction");
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.text, "Revised instruction");
});
