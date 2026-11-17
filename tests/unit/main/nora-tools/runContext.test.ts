import assert from "node:assert/strict";
import test from "node:test";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { createRunContext } from "@main/nora-tools/runContext";
import { instructionWithTurnNotes, runMcpServers } from "@main/nora-tools/endpoint";
import { snapshotBot } from "@shared/bots/snapshot";
import type { NoraToolServer, RunContextConnectors, RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";
import { conversation } from "./fixture";
import { bot } from "../../shared/bots/fixtures";

const endpoint = { url: "http://127.0.0.1:1/mcp", token: "t" };
const server = (available: boolean): NoraToolServer => ({ resolve: async () => available ? endpoint : null, running: () => available, close: async () => {} });
const linear: RunMcpServer = { name: "linear", url: "http://127.0.0.1:2/connectors/a", token: "g" };
const connectors = (servers: RunMcpServer[] = [], subjects: ConnectorSubject[] = []): RunContextConnectors => ({
  endpoints: async (subject) => { subjects.push(subject); return servers; },
  activeCount: (subject) => { subjects.push(subject); return servers.length; }
});

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
  const resolve = createRunContext(server(true), memory, connectors()).resolve;
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
  const withTools = await createRunContext(server(true), memory, connectors()).resolve(conversation("plain"));
  assert.match(withTools.guidance ?? "", /\(8 older notes are not shown; search them with recall\.\)/);
  const offline = await createRunContext(server(false), memory, connectors()).resolve(conversation("plain"));
  assert.equal(offline.tools, null);
  assert.match(offline.guidance ?? "", /^Your saved notes/);
  assert.equal(await createRunContext(server(true), memory, connectors()).resolve(conversation("room", { group: { members: [], writer: null, lead: null, hopLimit: 4 } }))
    .then((context) => context.guidance), null);
});

test("notes stay fixed in a thread's guidance; later changes ride with the next turn once, so the cached prefix stays valid", async (t) => {
  const memory = memoryFixture(t);
  const first = memory.add({ botId: "nora", workspaceId: null, text: "Prefers dark mode", source: { kind: "user" } });
  const resolve = createRunContext(server(true), memory, connectors()).resolve;
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

test("provider threads get connectors alongside Nora's tools; coordinated chats get neither", async (t) => {
  const memory = memoryFixture(t);
  const source = createRunContext(server(true), memory, connectors([linear]));
  const context = await source.resolve(conversation("plain"));
  assert.deepEqual(context.connectors, [linear]);
  assert.deepEqual(runMcpServers(context).map((entry) => entry.name), ["nora", "linear"]);
  assert.ok(runMcpServers(context)[0]?.trustedTools?.includes("ask_bot"), "Nora's own tools skip approval");
  assert.equal(runMcpServers(context)[1]?.trustedTools, undefined, "connector tools keep the runtime's approval");
  assert.equal(source.preview(conversation("plain")).connectors, 1);
  const room = conversation("room", { group: { members: [], writer: null, lead: null, hopLimit: 4 } });
  assert.deepEqual((await source.resolve(room)).connectors, []);
  assert.equal(source.preview(room).connectors, 0);
});

test("a connector failure never blocks the turn", async (t) => {
  const memory = memoryFixture(t);
  const failing: RunContextConnectors = { endpoints: async () => { throw new Error("gateway down"); }, activeCount: () => 1 };
  const context = await createRunContext(server(true), memory, failing).resolve(conversation("plain"));
  assert.deepEqual(context.connectors, []);
  assert.deepEqual(context.tools, endpoint);
});

test("connectors are chosen for the thread's workspace and bot", async (t) => {
  const memory = memoryFixture(t);
  const subjects: ConnectorSubject[] = [];
  const source = createRunContext(server(true), memory, connectors([linear], subjects));
  await source.resolve(conversation("plain"));
  source.preview(conversation("bot", { bot: snapshotBot(bot("ada")) }));
  assert.deepEqual(subjects, [{ workspaceId: "w", botId: null }, { workspaceId: "w", botId: "ada" }]);
});
