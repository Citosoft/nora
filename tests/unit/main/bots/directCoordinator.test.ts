import assert from "node:assert/strict";
import test from "node:test";
import { DirectCoordinator } from "@main/bots/direct/coordinator";
import { resolveDirectRoute, taskTitle } from "@main/bots/direct/routing";
import { parseDirectRoute } from "@main/bots/direct/router";
import { directPrompt } from "@main/bots/direct/prompt";
import type { ConversationRun, ProviderBinding, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { NORA_CHAT } from "@shared/bots/noraChat";
import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { ProviderUpdate } from "@main/types/execution/provider.types";
import type { DirectRouter } from "@main/types/bots/chats.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const ada = bot("ada");
const ref = (projectId: string): WorkspaceRef => ({ projectId, environmentId: "local", checkoutId: projectId, path: `/${projectId}`, branch: "main", access: "read" });
const workspaces = [{ id: "app", name: "App", workspace: ref("app") }, { id: "site", name: "Site", workspace: ref("site") }];
const direct: DirectDescriptor = { botId: "ada", name: "Ada", role: ada.role, avatar: ada.avatar, scope: { kind: "global" }, workspaceId: "app" };
const message = (id: string, text: string, extra: Partial<Extract<TimelineItem, { kind: "message" }>> = {}): TimelineItem =>
  ({ kind: "message", id, runId: "r", createdAt: "2026-11-13T00:00:00.000Z", role: "user", text, complete: true, ...extra });

const noraProvider: ProviderBinding = { kind: "claude", instanceId: "claude", model: "opus", reasoning: null, permissionPolicy: "default" };

async function runChat(instruction: string, route: DirectRouter, setup?: (fake: ReturnType<typeof fakeHost>) => void, interruptAfterMs?: number, workspaceId?: string,
  descriptor: DirectDescriptor = direct) {
  const fake = fakeHost([ada], () => instruction.includes("think forever") ? null : `done: ${instruction}`);
  const chat = conversation("dm", { title: descriptor.name, provider: { kind: "nora", instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" }, direct: descriptor });
  fake.add(chat);
  setup?.(fake);
  let sequence = 0;
  const coordinator = new DirectCoordinator({ host: fake.host, nextId: () => `id${++sequence}`, now: () => "2026-11-13T00:00:00.000Z",
    bot: (workspaceId, botId) => botId === "ada" && workspaceId !== "hidden" ? ada : null, noraBinding: async () => noraProvider, workspaces: () => workspaces, route });
  const updates: ProviderUpdate[] = [];
  const run = { id: "run", conversationId: "dm", instruction, state: "starting", attemptId: "a", ...(workspaceId ? { workspaceId } : {}) } as ConversationRun;
  const execution = { snapshot: { conversation: chat, runs: [run], items: [], requests: [] } as never, run };
  const started = coordinator.start(execution, (update) => { updates.push(update); });
  if (interruptAfterMs !== undefined) setTimeout(() => void coordinator.interrupt(execution), interruptAfterMs);
  await started;
  const items = updates.flatMap((update) => update.kind === "item" ? [update.item] : []);
  const replies = items.flatMap((item) => item.kind === "message" ? [[item.author?.name, item.text, item.workThreadId]] : []);
  const finished = updates.find((update) => update.kind === "finished");
  const threads = [...fake.conversations.values()].filter((entry) => entry.parentId === "dm");
  return { fake, replies, threads, status: finished?.kind === "finished" ? finished.status : null };
}

test("a new task starts a write-enabled work thread in the routed workspace and links the reply to it", async () => {
  const result = await runChat("Fix the footer on the site", async () => ({ kind: "new", workspaceId: "site", title: "Footer fix", done: null }));
  assert.equal(result.threads.length, 1);
  const [thread] = result.threads;
  assert.deepEqual([thread.title, thread.workspace.projectId, thread.workspace.access, thread.bot?.botId], ["Footer fix", "site", "write", "ada"]);
  assert.deepEqual(result.replies, [["Ada", "done: Fix the footer on the site", thread.id]]);
  assert.equal(result.status, "completed");
});

test("Nora's chat starts ordinary Nora work threads on its chat model, in any workspace, and replies as Nora", async () => {
  const noraDirect: DirectDescriptor = { botId: NORA_CHAT.id, name: NORA_CHAT.name, role: NORA_CHAT.role, avatar: NORA_CHAT.avatar, scope: { kind: "global" }, workspaceId: "app" };
  const result = await runChat("Tidy the site styles", async () => ({ kind: "new", workspaceId: "site", title: "Style tidy", done: null }), undefined, undefined, undefined, noraDirect);
  assert.equal(result.threads.length, 1);
  const [thread] = result.threads;
  assert.deepEqual([thread.title, thread.workspace.projectId, thread.workspace.access, thread.bot], ["Style tidy", "site", "write", undefined]);
  assert.deepEqual(thread.provider, noraProvider);
  assert.deepEqual(result.replies, [["Nora", "done: Tidy the site styles", thread.id]]);
});

test("a new task carries the router's done criteria on its thread and in its first prompt", async () => {
  const result = await runChat("Fix the footer on the site", async () => ({ kind: "new", workspaceId: "site", title: "Footer fix", done: "Every footer link opens its page" }));
  const create = result.fake.commands.find((command) => command.kind === "create");
  assert.equal(create?.kind === "create" ? create.done : null, "Every footer link opens its page");
  const submit = result.fake.commands.find((command) => command.kind === "submit");
  assert.match(submit?.kind === "submit" ? submit.instruction : "", /Done means: Every footer link opens its page/);
});

test("a follow-up continues its open work thread instead of starting another", async () => {
  const result = await runChat("And the header?", async () => ({ kind: "continue", threadId: "task" }), (fake) => {
    fake.add(conversation("task", { parentId: "dm", workspace: { ...ref("app"), access: "write" }, bot: undefined }));
  });
  assert.equal(result.threads.length, 1);
  assert.equal(result.replies[0]?.[2], "task");
});

test("the chat never continues a branch the user started, and its work thread shows the user's own words", async () => {
  const result = await runChat("Ship it", async () => ({ kind: "continue", threadId: "side" }), (fake) => {
    fake.add(conversation("side", { parentId: "dm", workspace: { ...ref("app"), access: "write" }, chatBranch: { from: null } }));
  });
  const task = result.threads.find((entry) => entry.id !== "side");
  assert.ok(task);
  assert.equal(result.replies[0]?.[2], task.id);
  const submit = result.fake.commands.find((command) => command.kind === "submit");
  assert.equal(submit?.kind === "submit" ? submit.chatText : null, "Ship it");
});

test("without a usable route, the latest open task in the working workspace continues, otherwise a new one starts there", () => {
  const threads = [{ id: "old", title: "Old", workspaceId: "app", workspaceName: "App", updatedAt: "2026-11-01" },
    { id: "new", title: "New", workspaceId: "app", workspaceName: "App", updatedAt: "2026-11-02" },
    { id: "away", title: "Away", workspaceId: "site", workspaceName: "Site", updatedAt: "2026-11-03" }];
  const base = { message: "Ship it", threads, workspaces, defaultWorkspaceId: "app" };
  assert.deepEqual(resolveDirectRoute({ ...base, route: null }), { kind: "continue", threadId: "new" });
  assert.deepEqual(resolveDirectRoute({ ...base, route: { kind: "continue", threadId: "gone" } }), { kind: "continue", threadId: "new" });
  assert.deepEqual(resolveDirectRoute({ ...base, route: { kind: "new", workspaceId: "nowhere", title: "x", done: null } }), { kind: "continue", threadId: "new" });
  assert.deepEqual(resolveDirectRoute({ ...base, threads: [], route: null }), { kind: "new", workspaceId: "app", title: "Ship it", done: null });
  assert.deepEqual(resolveDirectRoute({ ...base, route: { kind: "new", workspaceId: "site", title: " ", done: "Shipped" } }), { kind: "new", workspaceId: "site", title: "Ship it", done: "Shipped" });
  assert.equal(taskTitle("x".repeat(80)).length, 60);
});

test("the router's answer is parsed leniently and anything else means no opinion", () => {
  assert.deepEqual(parseDirectRoute('Sure: {"continue":"t1"}'), { kind: "continue", threadId: "t1" });
  assert.deepEqual(parseDirectRoute('{"new":"site","title":"Footer"}'), { kind: "new", workspaceId: "site", title: "Footer", done: null });
  assert.deepEqual(parseDirectRoute('{"new":"site","title":"Footer","done":" Links work "}'), { kind: "new", workspaceId: "site", title: "Footer", done: "Links work" });
  assert.equal(parseDirectRoute("none"), null);
  assert.equal(parseDirectRoute('{"maybe":1}'), null);
});

test("a new task sees the chat so far; a continuing one only what is new since it replied", () => {
  const items = [message("1", "Hi Ada"), message("2", "Hello!", { role: "assistant", workThreadId: "task", author: { kind: "bot", botId: "ada", name: "Ada", avatar: ada.avatar } }),
    message("3", "Now the header")];
  const fresh = directPrompt(direct, items, "other", "App");
  assert.match(fresh, /taking on in App/);
  assert.match(fresh, /\[User\]: Hi Ada/);
  const continuing = directPrompt(direct, items, "task", "App");
  assert.doesNotMatch(continuing, /Hi Ada/);
  assert.doesNotMatch(directPrompt(direct, items, "task", "App", "Header fixed"), /Done means/, "a continuing thread already has its criteria");
  assert.match(continuing, /\[User\]: Now the header/);
});

test("a router failure falls back to the working workspace, and Stop interrupts the work thread", async () => {
  const fallback = await runChat("Hello", async () => { throw new Error("no AI configured"); });
  assert.equal(fallback.threads[0]?.workspace.projectId, "app");
  const stopped = await runChat("think forever", async () => null, undefined, 5);
  assert.equal(stopped.status, "interrupted");
  assert.ok(stopped.fake.commands.some((command) => command.kind === "interrupt"));
});

test("a run pinned to a workspace works there, whatever the chat's working workspace or the router says", async () => {
  const result = await runChat("Routine: tidy the board", async () => ({ kind: "new", workspaceId: "app", title: "Board", done: null }), (fake) => {
    fake.add(conversation("task", { parentId: "dm", workspace: { ...ref("app"), access: "write" }, bot: undefined }));
  }, undefined, "site");
  const created = result.threads.filter((thread) => thread.id !== "task");
  assert.deepEqual(created.map((thread) => thread.workspace.projectId), ["site"]);
  assert.equal(result.replies[0]?.[2], created[0]?.id);
});

test("a run pinned to a workspace the bot is not available in does not run elsewhere", async () => {
  const result = await runChat("Routine", async () => null, undefined, undefined, "hidden");
  assert.equal(result.threads.length, 0);
  assert.equal(result.status, "completed");
});
