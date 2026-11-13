import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openBotMemoryStore } from "@main/bots/memory/store";

test("notes are per bot, scoped to everywhere or one workspace, searchable and bounded in the digest", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nora-memory-"));
  let clock = 0, sequence = 0;
  const store = openBotMemoryStore(join(directory, "memory.sqlite"), { now: () => new Date(Date.UTC(2026, 10, 13, 0, 0, clock++)).toISOString(), nextId: () => `n${++sequence}` });
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  store.add({ botId: "ada", workspaceId: null, text: "Prefers British spelling", source: { kind: "user" } });
  store.add({ botId: "ada", workspaceId: "w", text: "Releases ship on Tuesdays", source: { kind: "bot", conversationId: "c" } });
  store.add({ botId: "ada", workspaceId: "other", text: "Other workspace fact", source: { kind: "user" } });
  store.add({ botId: "rex", workspaceId: null, text: "Rex's note", source: { kind: "user" } });
  assert.deepEqual(store.list("ada", "w").map((note) => note.text), ["Releases ship on Tuesdays", "Prefers British spelling"]);
  assert.equal(store.list("ada", null).length, 3);
  assert.deepEqual(store.search("ada", "w", "tuesdays release", 5).map((note) => note.text), ["Releases ship on Tuesdays"]);
  assert.equal(store.digest("ada", "w", 1000), "- Releases ship on Tuesdays\n- Prefers British spelling");
  assert.equal(store.digest("ada", "w", 30), "- Releases ship on Tuesdays");
  assert.equal(store.digest("nobody", "w", 1000), null);
  const [first] = store.list("ada", "w");
  assert.equal(store.update(first.id, "Releases ship on Wednesdays").text, "Releases ship on Wednesdays");
  store.remove(first.id);
  assert.deepEqual(store.list("ada", "w").map((note) => note.text), ["Prefers British spelling"]);
  assert.throws(() => store.update("missing", "x"), /no longer exists/);
  assert.throws(() => store.add({ botId: "ada", workspaceId: null, text: " ", source: { kind: "user" } }));
});
