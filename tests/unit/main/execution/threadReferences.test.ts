import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createThreadReferenceWriter } from "@main/execution/thread-references/writeSnapshot";
import { referenceChunks } from "@main/execution/thread-references/chunks";
import type { ConversationSnapshot, TimelineItem } from "@shared/types/conversation/contracts.types";
import { fixture } from "./fixture";

test("text chunks preserve Unicode and stay within the read budget", () => {
  const text = "😀界\n".repeat(5000);
  const chunks = [...referenceChunks(text)];
  assert.equal(chunks.join(""), text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => Buffer.byteLength(chunk) <= 8000));
});

test("native chat snapshots paginate messages, bound large outputs, exclude reasoning and remain stable", async (t) => {
  const f = fixture(t); f.create();
  const root = await fs.mkdtemp(join(tmpdir(), "nora-chat-reference-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const text = "😀界\n".repeat(5000);
  const base = { runId: "run", createdAt: "2026-11-12T10:00:00.000Z" };
  const items: TimelineItem[] = [
    { ...base, id: "large", kind: "message", role: "user", text, complete: true },
    { ...base, id: "private", kind: "reasoning", text: "PRIVATE_REASONING", complete: true },
    ...Array.from({ length: 35 }, (_, index): TimelineItem => ({ ...base, id: `message-${index}`, kind: "message", role: "assistant", text: `Answer ${index}`, complete: true }))
  ];
  const snapshot: ConversationSnapshot = { ...f.snapshot(), items };
  const reference = await createThreadReferenceWriter(root)(snapshot, "2026-11-12T10:10:00.000Z");
  const directory = dirname(reference.indexPath);
  const names = await fs.readdir(directory);
  assert.ok(names.includes("index-2.md"));
  const index = await fs.readFile(reference.indexPath, "utf8");
  assert.ok(index.includes("index-2.md")); assert.ok(index.includes("captured" ) || index.includes("Captured"));
  assert.ok(!index.includes("Answer 34"), "the index does not inline message text");
  const parts = names.filter((name) => /^entry-1-\d+\.md$/.test(name)).sort((a, b) => Number(a.split("-")[2].split(".")[0]) - Number(b.split("-")[2].split(".")[0]));
  let restored = "";
  for (const name of parts) {
    const part = await fs.readFile(join(directory, name), "utf8");
    restored += part.slice(part.indexOf("\n\n") + 2);
  }
  assert.equal(restored, text);
  for (const name of names) {
    const data = await fs.readFile(join(directory, name));
    assert.ok(data.byteLength < 10_000, `${name} is bounded`);
    assert.ok(!data.toString().includes("PRIVATE_REASONING"));
  }
  snapshot.items.push({ ...base, id: "later", kind: "message", role: "user", text: "Later message", complete: true });
  assert.equal(await fs.readFile(reference.indexPath, "utf8"), index);
  assert.equal(reference.conversationId, snapshot.conversation.id);
  assert.equal(reference.cursor, snapshot.cursor);
});

test("an empty chat produces a readable snapshot without inventing history", async (t) => {
  const f = fixture(t); f.create();
  const root = await fs.mkdtemp(join(tmpdir(), "nora-empty-reference-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const reference = await createThreadReferenceWriter(root)(f.snapshot(), "2026-11-12T10:00:00.000Z");
  assert.match(await fs.readFile(reference.indexPath, "utf8"), /no shareable messages/);
});
