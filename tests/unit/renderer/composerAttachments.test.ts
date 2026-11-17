import assert from "node:assert/strict";
import test from "node:test";
import { handoffThread } from "@/components/app/logic/thread-workspace/handoff";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { buildComposerInstruction } from "@/components/app/logic/composerAttachments";
import { COMPOSER_ATTACHMENT_MAX_COUNT } from "@shared/composerAttachments";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadBinding, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ComposerAttachment } from "@shared/types/agentInput.types";

const image: ComposerAttachment = { id: "image", name: "Screenshot.png", path: "/saved/Screenshot.png", mimeType: "image/png", size: 30 };
const file: ComposerAttachment = { id: "file", name: "notes.txt", path: "/saved/notes.txt", mimeType: "text/plain", size: 10 };

function fixture() {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const id = store.openDraft({ workspaceId: "personal" }); assert.ok(id);
  store.setBinding(id, threadBinding, "chosen");
  return { ...f, store, id };
}

test("instructions include image and file references, quoting unusual names and paths", () => {
  assert.equal(buildComposerInstruction("  hello  "), "hello");
  assert.equal(buildComposerInstruction("", []), "");
  const instruction = buildComposerInstruction("Check these", [image, file]);
  assert.match(instruction, /^Check these\n\nAttached files/);
  assert.ok(instruction.includes(JSON.stringify(image.path)));
  assert.ok(instruction.includes(JSON.stringify(file.path)));
  assert.ok(buildComposerInstruction("", [{ ...file, name: 'a\n"b.txt' }]).includes(JSON.stringify('a\n"b.txt')));
});

test("attachments persist independently across drafts, removal, closing and restart", () => {
  const { store, id, deps } = fixture();
  store.addAttachments(id, [image, file]);
  store.removeAttachment(id, image.id);
  const second = store.openDraft({ workspaceId: "personal" }); assert.ok(second); assert.notEqual(id, second);
  store.closeDocument(id);
  const restored = createThreadWorkspaceStore(deps);
  assert.deepEqual(restored.snapshot().layout.documents.find((d) => d.id === id)?.attachments, [file]);
  assert.equal(restored.snapshot().layout.documents.find((d) => d.id === second)?.attachments?.length ?? 0, 0);
});

test("an attachment-only instruction survives uncertain delivery and retries the exact saved payload", async () => {
  const { store, id, deps, commands, loseNextReply } = fixture();
  store.addAttachments(id, [image, file]);
  loseNextReply(); await store.submit(id);
  const pending = store.snapshot().layout.documents[0].pending; assert.ok(pending);
  assert.equal(pending.submit.instruction, buildComposerInstruction("", [image, file]));
  store.removeAttachment(id, image.id);
  store.addAttachments(id, [{ ...file, id: "ignored" }]);
  assert.deepEqual(store.snapshot().layout.documents[0].attachments, [image, file]);
  const restored = createThreadWorkspaceStore(deps);
  await restored.submit(id);
  assert.deepEqual(commands.slice(0, 2), commands.slice(2));
  assert.deepEqual(restored.snapshot().layout.documents[0].attachments, []);
  assert.equal(restored.snapshot().layout.documents[0].pending, null);
});

test("oversized attachment batches are rejected without replacing the draft", () => {
  const { store, id } = fixture();
  store.addAttachments(id, [image]);
  store.addAttachments(id, Array.from({ length: COMPOSER_ATTACHMENT_MAX_COUNT }, (_, n) => ({ ...file, id: `file-${n}` })));
  assert.deepEqual(store.snapshot().layout.documents[0].attachments, [image]);
  assert.match(store.snapshot().runtime[id].error ?? "", /up to 10 files/);
});

test("old persisted drafts without an attachments field still load", () => {
  const { store, id, deps } = fixture();
  store.setText(id, "old draft");
  const restored = createThreadWorkspaceStore(deps);
  assert.equal(restored.snapshot().storageError, null);
  assert.equal(restored.snapshot().layout.documents[0].text, "old draft");
});

test("attachment-only drafts in existing threads remain visible and handoffs wait for review", async () => {
  const { store, commands } = fixture();
  await store.refresh();
  const id = store.openThread("existing"); assert.ok(id);
  store.addAttachments(id, [image]);
  const row = buildThreadNavigation(store.snapshot(), "personal", "all").find((entry) => entry.id === "existing");
  assert.equal(row?.hasDraft, true);
  const result = await handoffThread(store, "existing", "Review this context");
  assert.equal(result.kind, "draft");
  assert.equal(commands.length, 0);
  assert.deepEqual(store.snapshot().layout.documents.find((entry) => entry.id === id)?.attachments, [image]);
});

test("storage failure retains attachment references without sending until retry", async () => {
  const { store, id, commands, setUnavailable } = fixture();
  store.addAttachments(id, [file]);
  setUnavailable(true);
  await store.submit(id);
  assert.equal(commands.length, 0);
  assert.deepEqual(store.snapshot().layout.documents[0].attachments, [file]);
  assert.ok(store.snapshot().storageError);
  setUnavailable(false);
  await store.submit(id);
  assert.equal(commands.length, 2);
  assert.deepEqual(store.snapshot().layout.documents[0].attachments, []);
});
