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

test("Nora and bot threads get their own tool sets; group and direct chats and unknown threads get none", () => {
  const f = noraFixture();
  f.conversations.set("dm", conversation("dm", { direct: { botId: "ada", name: "Ada", role: "", avatar: { seed: 1 }, scope: { kind: "global" }, workspaceId: "w" } }));
  f.conversations.set("work", conversation("work", { parentId: "dm", bot: snapshotBot(bot("ada")) }));
  assert.equal(f.deps.context("dm"), null);
  assert.equal(f.deps.context("work")?.chat?.id, "dm");
  assert.equal(f.deps.context("plain")?.audience, "nora");
  assert.equal(f.deps.context("bot")?.audience, "bot");
  assert.equal(f.deps.context("missing"), null);
});

test("a bot answering in a chat reads that chat's messages, newest last, paging back with skip", () => {
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
  assert.equal(member.chat?.id, "room");
  assert.deepEqual(f.deps.chats.history(0, 2, member).messages.map((message) => [message.author, message.text]), [["Ada", "Ship Friday"], ["User", "Why Friday?"]]);
  assert.equal(f.deps.chats.history(0, 2, member).more, true);
  const older = f.deps.chats.history(2, 5, member);
  assert.deepEqual([older.messages.map((message) => message.text), older.more], [["Plan the launch"], false]);
  assert.throws(() => f.deps.chats.history(0, 5, contextOf(f, "bot")), /Only a bot answering in a group or direct chat/);
});

test("bots and Nora each keep their own notes through remember and recall", () => {
  const f = noraFixture();
  const botContext = contextOf(f, "bot");
  f.deps.memory.remember({ kind: "add", text: "Ship on Tuesdays", scope: "workspace" }, botContext);
  f.deps.memory.remember({ kind: "add", text: "Likes short answers", scope: "bot" }, botContext);
  assert.deepEqual(f.deps.memory.recall("tuesdays", botContext).map((note) => [note.text, note.workspaceId]), [["Ship on Tuesdays", "w"]]);
  assert.deepEqual(f.memory.digest("ada", "w", 1000)?.notes.map((note) => note.text), ["Likes short answers", "Ship on Tuesdays"]);
  const nora = contextOf(f);
  assert.equal(f.deps.memory.remember({ kind: "add", text: "Calls the app 'the workbench'", scope: "bot" }, nora).note.botId, "nora");
  assert.deepEqual(f.deps.memory.recall("", nora).map((note) => note.text), ["Calls the app 'the workbench'"]);
  assert.deepEqual(f.deps.memory.recall("", botContext).map((note) => note.text), ["Likes short answers", "Ship on Tuesdays"]);
});

test("a thread corrects and forgets only its own owner's saved notes, never the user's or another workspace's", () => {
  const f = noraFixture();
  const ada = contextOf(f, "bot");
  const saved = f.deps.memory.remember({ kind: "add", text: "Ship on Tuesdays", scope: "bot" }, ada).note;
  const corrected = f.deps.memory.remember({ kind: "update", memoryId: saved.id, text: "Ship on Wednesdays" }, ada);
  assert.deepEqual([corrected.updated, corrected.note.id, corrected.note.text], [true, saved.id, "Ship on Wednesdays"]);
  const userNote = f.memory.add({ botId: "ada", workspaceId: null, text: "Call me Dan", source: { kind: "user" } });
  assert.throws(() => f.deps.memory.remember({ kind: "update", memoryId: userNote.id, text: "x" }, ada), /only they can change it/);
  assert.throws(() => f.deps.memory.forget(userNote.id, ada), /only they can change it/);
  const elsewhere = f.memory.add({ botId: "ada", workspaceId: "personal", text: "Personal fact", source: { kind: "bot", conversationId: "c" } });
  assert.throws(() => f.deps.memory.forget(elsewhere.id, ada), /No note with id/);
  assert.throws(() => f.deps.memory.forget(saved.id, contextOf(f)), /No note with id/);
  assert.equal(f.deps.memory.forget(saved.id, ada).text, "Ship on Wednesdays");
  assert.equal(f.memory.get(saved.id), null);
  assert.throws(() => f.deps.memory.forget(saved.id, ada), /No note with id/);
});

test("a bot lists and reads only its own threads; Nora sees every thread", () => {
  const f = noraFixture();
  f.conversations.set("ada-earlier", conversation("ada-earlier", { bot: snapshotBot(bot("ada")), updatedAt: "2026-11-12T00:00:00.000Z" }));
  f.conversations.set("rex", conversation("rex", { bot: snapshotBot(bot("rex")) }));
  const ada = contextOf(f, "bot");
  const query = { allWorkspaces: true, includeSettled: true, limit: 30 };
  assert.deepEqual(f.deps.threads.list(query, ada).map((entry) => [entry.id, entry.current]), [["bot", true], ["ada-earlier", false]]);
  assert.equal(f.deps.threads.read("ada-earlier", 5, ada).title, "ada-earlier");
  assert.throws(() => f.deps.threads.read("older", 5, ada), /No thread with id "older"/);
  assert.throws(() => f.deps.threads.read("rex", 5, ada), /No thread with id "rex"/);
  assert.ok(f.deps.threads.list(query, contextOf(f)).some((entry) => entry.id === "rex"));
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
  const startedTask = await client.callTool({ name: "start_task", arguments: { id: "b" } });
  assert.notEqual(startedTask.isError, true);
  assert.match(JSON.stringify(startedTask.content), /In Progress/);
  const finishedTask = await client.callTool({ name: "finish_task", arguments: { id: "b" } });
  assert.notEqual(finishedTask.isError, true);
  assert.match(JSON.stringify(finishedTask.content), /completed/);
  assert.match(JSON.stringify((await client.callTool({ name: "read_task", arguments: { id: "b" } })).content), /Complete the work/);
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


test("task lifecycle uses a stable id, preserves assignments, and can be retried and reopened", async () => {
  const f = noraFixture();
  const context = contextOf(f, "bot");
  const assignment = { agentId: "bot", sessionId: "session", agentName: "Ada", toolId: "claude", toolLabel: "Claude", assignedAt: "2026-11-13T00:00:00.000Z" };
  f.board.taskAssignments[".nora/tasks/b.md"] = [assignment];
  assert.match((await f.deps.tasks.read("b", context)).content, /# Second/);
  const started = await f.deps.tasks.start("b", context);
  assert.deepEqual([started.id, started.completed, started.columnId], ["b", false, "in-progress"]);
  assert.deepEqual(await f.deps.tasks.start("b", context), started);
  const finished = await f.deps.tasks.finish("b", context);
  assert.deepEqual([finished.id, finished.path, finished.completed, finished.columnId], ["b", ".nora/tasks/completed/b.md", true, "done"]);
  assert.equal(f.board.taskPositions[started.path], undefined);
  assert.deepEqual(f.board.taskAssignments[finished.path], [assignment]);
  assert.equal(f.board.taskAssignments[started.path], undefined);
  assert.deepEqual(await f.deps.tasks.finish("b", context), finished);
  assert.equal((await f.deps.tasks.read("b", context)).task.completed, true);
  assert.equal((await f.deps.tasks.list(context)).find((task) => task.id === "b")?.completed, true);
  const reopened = await f.deps.tasks.start("b", context);
  assert.deepEqual(reopened, started);
  assert.deepEqual(f.board.taskAssignments[reopened.path], [assignment]);
  assert.equal(f.board.taskPositions[finished.path], undefined);
});

test("task lifecycle rejects unknown or ambiguous ids and missing lifecycle columns before changing files", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  await assert.rejects(f.deps.tasks.finish("missing", context), /No task with id/);
  await assert.rejects(f.deps.tasks.start("b", contextOf(f, "elsewhere")), /has no task board/);
  f.board.sections = f.board.sections.filter((section) => section.id !== "done");
  await assert.rejects(f.deps.tasks.finish("b", context), /no "done" column/);
  assert.ok(f.tasks.some((task) => task.path === ".nora/tasks/b.md"));
  f.tasks.push({ path: ".nora/tasks/completed/b.md", title: "Duplicate", completed: true, updatedAt: null });
  await assert.rejects(f.deps.tasks.start("b", context), /ambiguous/);
});


test("task mutations notify the renderer for the owning project, including completion and reopening", async () => {
  const f = noraFixture();
  try {
    const context = contextOf(f);
    await f.deps.tasks.list(context);
    await f.deps.tasks.read("b", context);
    assert.deepEqual(f.taskNotifications, [], "reads must not cause refresh loops");
    await f.deps.tasks.start("b", context);
    assert.deepEqual(f.taskNotifications, ["shell-w"]);
    await f.deps.tasks.finish("b", context);
    assert.deepEqual(f.taskNotifications, ["shell-w", "shell-w"]);
    assert.equal(f.tasks.find((task) => task.path === ".nora/tasks/completed/b.md")?.completed, true);
    assert.equal(f.board.taskPositions[".nora/tasks/completed/b.md"]?.sectionId, "done");
    await f.deps.tasks.start("b", context);
    assert.equal(f.taskNotifications.length, 3);
    const created = await f.deps.tasks.create("Ship", "Release it.", context);
    assert.equal(f.taskNotifications.length, 4);
    await f.deps.tasks.move(created.path, "in progress", context);
    assert.deepEqual(f.taskNotifications, Array<string>(5).fill("shell-w"));
    await assert.rejects(f.deps.tasks.finish("missing", context));
    await assert.rejects(f.deps.tasks.move(created.path, "Missing column", context));
    assert.equal(f.taskNotifications.length, 5, "rejected mutations must not announce changes");
  } finally {
    f.memory.close();
  }
});
