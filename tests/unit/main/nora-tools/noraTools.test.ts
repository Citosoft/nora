import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createNoraToolServer } from "@main/nora-tools/server";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import { conversation, noraFixture } from "./fixture";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../../shared/bots/fixtures";

const contextOf = (f: ReturnType<typeof noraFixture>, id = "plain") => { const context = f.deps.context(id); assert.ok(context); return context; };

test("create_bot defaults to the thread's model, everywhere, and avoids taken ids", async () => {
  const f = noraFixture();
  const created = await f.deps.bots.create({ name: "Ada", role: "Reviewer", instructions: "Review carefully.", shape: "cloud" }, contextOf(f));
  assert.equal(created.id, "ada-2");
  assert.deepEqual(created.scope, { kind: "global" });
  assert.deepEqual(created.binding, { kind: "claude", instanceId: "claude", model: "claude-opus-5-5", reasoning: "high", permissionPolicy: null });
  assert.equal(created.avatar.shape, "cloud");
  assert.deepEqual(f.deps.bots.list(contextOf(f)).map((entry) => entry.bot.id), ["ada", "ada-2"]);
});

test("create_bot checks explicit providers and models and supports workspace sharing", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  const codex = await f.deps.bots.create({ name: "Rex", provider: "codex", availability: "workspace", sharing: "shared" }, context);
  assert.deepEqual([codex.binding.kind, codex.binding.model, codex.binding.reasoning], ["codex", "gpt-6", null]);
  assert.deepEqual(codex.scope, { kind: "workspace", workspaceId: "w", storage: "shared" });
  await assert.rejects(f.deps.bots.create({ name: "Bad", provider: "codex", model: "gpt-1" }, context), /no model "gpt-1".*gpt-6/);
  await assert.rejects(f.deps.bots.create({ name: "Bad", provider: "gemini" }, context), /No installed provider matches "gemini"/);
  // Naming the thread's own provider reuses its model even when the provider's model list is offline.
  assert.equal((await f.deps.bots.create({ name: "Same", provider: "claude" }, context)).binding.model, "claude-opus-5-5");
});

test("update_bot changes only the given fields, keeps the bot's model unless asked, and reports the saved revision", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  const renamed = await f.deps.bots.update({ id: "ada", role: "Release manager", colour: "teal" }, context);
  assert.deepEqual([renamed.name, renamed.role, renamed.instructions, renamed.revision, renamed.avatar.palette], ["Ada", "Release manager", "Be concise.", 2, "teal"]);
  assert.equal(renamed.binding.model, "claude-opus-5-5");
  const moved = await f.deps.bots.update({ id: "ada", provider: "codex" }, context);
  assert.deepEqual([moved.binding.kind, moved.binding.model], ["codex", "gpt-6"]);
  await assert.rejects(f.deps.bots.update({ id: "nobody" }, context), /No bot with id "nobody"/);
});

test("app tools describe workspaces and every provider's models", async () => {
  const f = noraFixture();
  const workspaces = f.deps.app.workspaces(contextOf(f));
  assert.deepEqual(workspaces.map((entry) => [entry.name, entry.current, entry.branch]), [["Web", true, "main"], ["Personal", false, null]]);
  const models = await f.deps.app.models(contextOf(f));
  assert.deepEqual(models.map((entry) => [entry.kind, entry.models, entry.unavailable]), [["claude", [], "offline"], ["codex", ["gpt-6"], null]]);
});

test("thread tools list this workspace's open threads and read final messages without tool output", () => {
  const f = noraFixture();
  const context = contextOf(f);
  assert.deepEqual(f.deps.threads.list({ allWorkspaces: false, includeSettled: false, limit: 30 }, context).map((entry) => [entry.id, entry.current, entry.bot]),
    [["plain", true, null], ["older", false, null], ["bot", false, "Ada"]]);
  assert.deepEqual(f.deps.threads.list({ allWorkspaces: true, includeSettled: true, limit: 2 }, context).map((entry) => entry.id), ["plain", "settled"]);
  const transcript = f.deps.threads.read("older", 20, context);
  assert.deepEqual(transcript.messages.map((entry) => [entry.role, entry.text]), [["user", "Plan the release"], ["assistant", "Here is the plan."]]);
  assert.equal(f.deps.threads.read("older", 1, context).truncated, true);
  assert.throws(() => f.deps.threads.read("missing", 5, context), /No thread with id "missing"/);
});

test("task tools list by column, create with details and move by column title", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  assert.deepEqual((await f.deps.tasks.list(context)).map((task) => [task.title, task.column]), [["Second", "Todo"], ["First", "Done"]]);
  const created = await f.deps.tasks.create("Ship", "Release it.", context);
  assert.deepEqual([created.path, created.title, created.column], [".nora/tasks/ship.md", "Ship", "Todo"]);
  const moved = await f.deps.tasks.move(created.path, "in progress", context);
  assert.equal(moved.column, "In Progress");
  assert.deepEqual(f.board.taskPositions[created.path], { sectionId: "in-progress", order: 0 });
  await assert.rejects(f.deps.tasks.move(created.path, "Someday", context), /No column "Someday". Columns: Todo, In Progress, Done/);
  await assert.rejects(f.deps.tasks.move("nope.md", "Done", context), /No task at "nope.md"/);
  await assert.rejects(f.deps.tasks.list(contextOf(f, "elsewhere")), /has no task board/);
});

test("Nora and bot threads get their own tool sets; group chats and unknown threads get none", () => {
  const f = noraFixture();
  assert.equal(f.deps.context("plain")?.audience, "nora");
  assert.equal(f.deps.context("bot")?.audience, "bot");
  assert.equal(f.deps.context("missing"), null);
});

test("a bot answering in a group reads that group's messages, newest last, paging back with skip", () => {
  const f = noraFixture();
  const ada = { kind: "bot" as const, botId: "ada", name: "Ada", avatar: { seed: 1 } };
  f.conversations.set("room", conversation("room", { title: "Launch", group: { members: [], writer: null, lead: null, hopLimit: 4 } }));
  f.conversations.set("member", conversation("member", { parentId: "room", bot: snapshotBot(bot("ada")) }));
  f.items.set("room", [
    { kind: "message", id: "m1", runId: "r", createdAt: "2026-11-13T00:00:01.000Z", role: "user", text: "Plan the launch", complete: true },
    { kind: "milestone", id: "s", runId: "r", createdAt: "2026-11-13T00:00:02.000Z", text: "Nobody picked this up." },
    { kind: "message", id: "m2", runId: "r", createdAt: "2026-11-13T00:00:03.000Z", role: "assistant", text: "Ship Friday", complete: true, author: ada },
    { kind: "message", id: "m3", runId: "r", createdAt: "2026-11-13T00:00:04.000Z", role: "user", text: "Why Friday?", complete: true }]);
  const member = contextOf(f, "member");
  assert.equal(member.group?.id, "room");
  assert.deepEqual(f.deps.groups.history(0, 2, member).messages.map((message) => [message.author, message.text]), [["Ada", "Ship Friday"], ["User", "Why Friday?"]]);
  assert.equal(f.deps.groups.history(0, 2, member).more, true);
  const older = f.deps.groups.history(2, 5, member);
  assert.deepEqual([older.messages.map((message) => message.text), older.more], [["Plan the launch"], false]);
  assert.throws(() => f.deps.groups.history(0, 5, contextOf(f, "bot")), /Only a bot answering in a group chat/);
});

test("bots keep notes through remember and recall; Nora threads cannot", () => {
  const f = noraFixture();
  const botContext = f.deps.context("bot");
  assert.ok(botContext);
  f.deps.memory.remember("Ship on Tuesdays", "workspace", botContext);
  f.deps.memory.remember("Likes short answers", "bot", botContext);
  assert.deepEqual(f.deps.memory.recall("tuesdays", botContext).map((note) => [note.text, note.workspaceId]), [["Ship on Tuesdays", "w"]]);
  assert.equal(f.memory.digest("ada", "w", 1000), "- Likes short answers\n- Ship on Tuesdays");
  assert.throws(() => f.deps.memory.remember("x", "bot", contextOf(f)), /Only bots keep notes/);
});

test("the loopback server serves every catalog tool only to the thread its token was issued for", async (t) => {
  const f = noraFixture();
  let started = 0;
  const server = createNoraToolServer(f.deps, () => { started += 1; });
  t.after(() => server.close());
  assert.equal(server.running(), false);
  const endpoint = await server.resolve(f.conversations.get("plain") as Conversation);
  assert.ok(endpoint);
  assert.match(endpoint.url, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
  assert.deepEqual(await server.resolve(f.conversations.get("plain") as Conversation), endpoint);
  assert.equal(server.running(), true);
  assert.equal(started, 1);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } }));
  t.after(() => client.close());
  const listed = (await client.listTools()).tools;
  const catalog = noraToolsStatus("running").tools.filter((tool) => tool.audience.includes("nora"));
  assert.deepEqual(listed.map((tool) => tool.name).sort(), catalog.map((tool) => tool.name).sort());
  for (const tool of listed) assert.equal(tool.description, catalog.find((entry) => entry.name === tool.name)?.description);
  const preferences = await client.callTool({ name: "get_settings", arguments: {} });
  assert.match(JSON.stringify(preferences.content), /automaticTitles/);
  assert.match(JSON.stringify(preferences.content), /apiKeys/);
  const updated = await client.callTool({ name: "update_settings", arguments: { appearance: { themeMode: "dark" }, general: { confirmSplitViewDelete: false }, threads: { automaticTitles: false } } });
  assert.notEqual(updated.isError, true);
  assert.equal((await f.deps.settings.read()).appearance.themeMode, "dark");
  assert.equal(f.settings.confirmSplitViewDelete, false);
  assert.equal(f.settings.personalization.threads?.automaticTitles, false);
  const invalidSettings = await client.callTool({ name: "update_settings", arguments: { general: { confirmSplitViewDelete: "no" } } });
  assert.equal(invalidSettings.isError, true);
  const created = await client.callTool({ name: "create_bot", arguments: { name: "Pip", role: "Notes" } });
  assert.match(JSON.stringify(created.content), /Created Pip \(id pip\), available everywhere/);
  const failed = await client.callTool({ name: "move_task", arguments: { path: "nope.md", column: "Done" } });
  assert.equal(failed.isError, true);
  assert.match(JSON.stringify(failed.content), /No task at/);
  assert.match(JSON.stringify((await client.callTool({ name: "read_thread", arguments: { id: "older" } })).content), /Plan the release/);
  const refused = await fetch(endpoint.url, { method: "POST", headers: { Authorization: "Bearer wrong", "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  assert.equal(refused.status, 401);
  const botEndpoint = await server.resolve(f.conversations.get("bot") as Conversation);
  assert.ok(botEndpoint);
  const botClient = new Client({ name: "test", version: "1.0.0" });
  await botClient.connect(new StreamableHTTPClientTransport(new URL(botEndpoint.url), { requestInit: { headers: { Authorization: `Bearer ${botEndpoint.token}` } } }));
  t.after(() => botClient.close());
  assert.deepEqual((await botClient.listTools()).tools.map((tool) => tool.name).sort(),
    noraToolsStatus("running").tools.filter((tool) => tool.audience.includes("bot")).map((tool) => tool.name).sort());
  await server.close();
  assert.equal(server.running(), false);
});
