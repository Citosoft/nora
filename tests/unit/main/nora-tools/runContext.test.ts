import assert from "node:assert/strict";
import test from "node:test";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { createRunContextResolver } from "@main/nora-tools/runContext";
import { instructionWithTurnNotes } from "@main/nora-tools/endpoint";
import { snapshotBot } from "@shared/bots/snapshot";
import type { NoraToolServer } from "@main/types/nora-tools/noraTools.types";
import { conversation } from "./fixture";
import { bot } from "../../shared/bots/fixtures";

const endpoint = { url: "http://127.0.0.1:1/mcp", token: "t" };
const server = (available: boolean): NoraToolServer => ({ resolve: async () => available ? endpoint : null, running: () => available, close: async () => {} });

function memoryFixture(t: test.TestContext) {
  let sequence = 0;
  const memory = openBotMemoryStore(":memory:", { now: () => `2026-11-13T00:00:${String(sequence).padStart(2, "0")}.000Z`, nextId: () => `n${++sequence}` });
  t.after(() => memory.close());
  return memory;
}

test("Nora threads get their own notes and the continuity guidance; bots get theirs", async (t) => {
  const memory = memoryFixture(t);
  memory.add({ botId: "nora", workspaceId: null, text: "Prefers dark mode", source: { kind: "user" } });
  memory.add({ botId: "ada", workspaceId: null, text: "Ada's note", source: { kind: "user" } });
  const resolve = createRunContextResolver(server(true), memory);
  const nora = await resolve(conversation("plain"));
  assert.deepEqual(nora.tools, endpoint);
  assert.match(nora.guidance ?? "", /You are Nora/);
  assert.match(nora.guidance ?? "", /save it with remember/);
  assert.match(nora.guidance ?? "", /- \[n1\] Prefers dark mode/);
  assert.doesNotMatch(nora.guidance ?? "", /Ada's note/);
  const ada = await resolve(conversation("bot", { bot: snapshotBot(bot("ada")) }));
  assert.match(ada.guidance ?? "", /- \[n2\] Ada's note/);
  assert.doesNotMatch(ada.guidance ?? "", /You are Nora|Prefers dark mode/);
});

test("notes that do not fit are counted and pointed at recall; without tools only the notes remain", async (t) => {
  const memory = memoryFixture(t);
  for (let index = 0; index < 12; index += 1) memory.add({ botId: "nora", workspaceId: null, text: `${index} ${"x".repeat(900)}`, source: { kind: "user" } });
  const withTools = await createRunContextResolver(server(true), memory)(conversation("plain"));
  assert.match(withTools.guidance ?? "", /\(8 older notes are not shown; search them with recall\.\)/);
  const offline = await createRunContextResolver(server(false), memory)(conversation("plain"));
  assert.equal(offline.tools, null);
  assert.match(offline.guidance ?? "", /^Your saved notes/);
  assert.equal(await createRunContextResolver(server(true), memory)(conversation("room", { group: { members: [], writer: null, lead: null, hopLimit: 4 } }))
    .then((context) => context.guidance), null);
});

test("notes stay fixed in a thread's guidance; later changes ride with the next turn once, so the cached prefix stays valid", async (t) => {
  const memory = memoryFixture(t);
  const first = memory.add({ botId: "nora", workspaceId: null, text: "Prefers dark mode", source: { kind: "user" } });
  const resolve = createRunContextResolver(server(true), memory);
  const thread = conversation("plain");
  const opening = await resolve(thread);
  assert.equal(opening.turnNotes, null);
  assert.equal((await resolve(thread)).turnNotes, null, "nothing changed");
  const added = memory.add({ botId: "nora", workspaceId: null, text: "Calls the sidebar the rail", source: { kind: "review", conversationId: "other" } });
  memory.update(first.id, "Prefers light mode");
  const changed = await resolve(thread);
  assert.equal(changed.guidance, opening.guidance, "the system guidance never changes within a thread");
  assert.match(changed.turnNotes ?? "", /^<nora_note_update>\nYour saved notes changed since this thread began/);
  assert.match(changed.turnNotes ?? "", new RegExp(`- \\[${added.id}\\] Calls the sidebar the rail`));
  assert.match(changed.turnNotes ?? "", new RegExp(`- \\[${first.id}\\] Prefers light mode`));
  assert.equal((await resolve(thread)).turnNotes, null, "an unchanged update is not repeated");
  memory.remove(added.id);
  const removed = await resolve(thread);
  assert.doesNotMatch(removed.turnNotes ?? "", /Calls the sidebar/);
  assert.match(removed.turnNotes ?? "", /Prefers light mode/);
  memory.update(first.id, "Prefers dark mode");
  assert.match((await resolve(thread)).turnNotes ?? "", /back to the ones in your instructions/);
  const other = await resolve(conversation("fresh"));
  assert.match(other.guidance ?? "", /Prefers dark mode/);
  assert.equal(other.turnNotes, null, "a new thread freezes the current notes");
  memory.remove(first.id);
  assert.match((await resolve(thread)).turnNotes ?? "", new RegExp(`No longer among your newest notes.*\\[${first.id}\\]`));
});

test("turn notes go in front of the user's words", () => {
  assert.equal(instructionWithTurnNotes("Ship it", { turnNotes: null }), "Ship it");
  assert.equal(instructionWithTurnNotes("Ship it", { turnNotes: "<nora_note_update>x</nora_note_update>" }), "<nora_note_update>x</nora_note_update>\n\nShip it");
});
