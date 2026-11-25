import assert from "node:assert/strict";
import test from "node:test";
import { createAskOperations, ASK_DEPTH_LIMIT } from "@main/nora-tools/operations/asks";
import { formatAskBotFinishedNotice } from "@shared/nora-tools/askBot";
import { snapshotBot } from "@shared/bots/snapshot";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import { bot } from "../../shared/bots/fixtures";
import { conversation, workspace } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const bots = [bot("ada"), bot("rex"), bot("moss")];
const boot = { environmentId: "local", cursor: 0, sharedBots: [], providers: [], workspaces: [], noraTools: noraToolsStatus("idle"),
  personalization: { defaultRole: null, workspaceRoles: {}, bots: { global: bots, workspaces: {} } } } as NativeBoot;
const setup = (reply: Parameters<typeof fakeHost>[1]) => {
  const fake = fakeHost(bots, reply);
  let sequence = 0;
  const asks = createAskOperations({ host: fake.host, nextId: () => `id${++sequence}`, boot: () => boot, saveBot: async () => {}, memory: {} as never, secrets: {} as never, apps: {} as never, connectorTools: {} as never });
  return { fake, asks };
};
const signal = new AbortController().signal;

test("ask_bot with wait=reply runs the bot with the caller's workspace access, frames who is asking, and continues the same thread next time", async () => {
  const { fake, asks } = setup((botId, instruction) => `${botId} heard: ${instruction.split("\n").at(-1)}`);
  const parent = conversation("parent", { title: "Release" });
  fake.add(parent);
  const first = await asks.ask("Rex", "Is the build green?", "reply", { conversation: parent, audience: "nora" }, signal);
  assert.equal(first.botName, "Rex");
  assert.ok(first.status === "replied");
  assert.equal(first.reply, "rex heard: Is the build green?");
  const child = fake.conversations.get(first.conversationId);
  assert.deepEqual([child?.parentId, child?.bot?.botId, child?.workspace.access, child?.provider.permissionPolicy], ["parent", "rex", "write", "default"]);
  const submit = fake.commands.find((command) => command.kind === "submit");
  assert.match(submit?.kind === "submit" ? submit.instruction : "", /^Nora, on the user's behalf asks you \(in thread "Release"\)/);
  const second = await asks.ask("rex", "And now?", "reply", { conversation: parent, audience: "nora" }, signal);
  assert.equal(second.conversationId, first.conversationId);
});

test("ask_bot with wait=notify returns at once and posts the bot's answer into the parent when it finishes", async () => {
  const { fake, asks } = setup(() => "Build is green.");
  const parent = conversation("parent", { title: "Release" });
  fake.add(parent);
  const first = await asks.ask("ada", "Check the build", "notify", { conversation: parent, audience: "nora" }, signal);
  assert.equal(first.status, "working");
  assert.ok(first.status === "working");
  assert.equal(first.reason, "notify");
  const notice = await new Promise<Extract<(typeof fake.commands)[number], { kind: "submit" }>>((resolve, reject) => {
    const deadline = Date.now() + 1_000;
    const poll = (): void => {
      const found = fake.commands.find((command) => command.kind === "submit" && command.conversationId === "parent"
        && command.instruction.includes("finished what you asked"));
      if (found?.kind === "submit") { resolve(found); return; }
      if (Date.now() > deadline) { reject(new Error("parent was not notified")); return; }
      setTimeout(poll, 5);
    };
    poll();
  });
  assert.equal(notice.instruction, formatAskBotFinishedNotice("Ada", first.conversationId, { status: "completed", text: "Build is green.", failure: null }));
});

test("ask_bot gives global bots write access even when the caller only reads", async () => {
  const { fake, asks } = setup(() => "ok");
  const parent = conversation("review", { workspace: { ...workspace, access: "read" } });
  fake.add(parent);
  const result = await asks.ask("ada", "Fix the typo", "reply", { conversation: parent, audience: "nora" }, signal);
  assert.equal(fake.conversations.get(result.conversationId)?.workspace.access, "write");
});

test("ask_bot keeps a workspace bot within the caller's read access", async () => {
  const local = bot("quill", { kind: "workspace", workspaceId: "w", storage: "private" });
  const bootWithLocal = { ...boot, personalization: { ...boot.personalization, bots: { global: bots, workspaces: { w: { private: [local], hidden: [] } } } } } as NativeBoot;
  const fake = fakeHost([...bots, local], () => "ok");
  let sequence = 0;
  const asks = createAskOperations({ host: fake.host, nextId: () => `id${++sequence}`, boot: () => bootWithLocal, saveBot: async () => {}, memory: {} as never, secrets: {} as never, apps: {} as never, connectorTools: {} as never });
  const parent = conversation("review", { workspace: { ...workspace, access: "read" } });
  fake.add(parent);
  const result = await asks.ask("quill", "What looks wrong?", "reply", { conversation: parent, audience: "nora" }, signal);
  assert.equal(fake.conversations.get(result.conversationId)?.workspace.access, "read");
});

test("ask_bot promotes a leftover read-only child to a write thread when the caller can write", async () => {
  const { fake, asks } = setup(() => "done");
  const parent = conversation("parent");
  fake.add(parent);
  fake.add(conversation("old-rex", { parentId: "parent", bot: snapshotBot(bots[1]), workspace: { ...workspace, access: "read" }, title: "Rex: old" }));
  const result = await asks.ask("rex", "Edit the footer", "reply", { conversation: parent, audience: "nora" }, signal);
  assert.notEqual(result.conversationId, "old-rex");
  assert.equal(fake.conversations.get("old-rex")?.archivedAt, "2026-11-13T00:00:00.000Z");
  assert.equal(fake.conversations.get(result.conversationId)?.workspace.access, "write");
});

test("ask_bot refuses unknown bots, self-asks, loops and over-long chains", async () => {
  const { fake, asks } = setup(() => "ok");
  const root = conversation("root");
  const ada = conversation("ada-thread", { parentId: "root", bot: snapshotBot(bots[0]) });
  const rex = conversation("rex-thread", { parentId: "ada-thread", bot: snapshotBot(bots[1]) });
  for (const entry of [root, ada, rex]) fake.add(entry);
  await assert.rejects(asks.ask("Zed", "hi", "reply", { conversation: root, audience: "nora" }, signal), /No bot called "Zed" here. Available: Ada, Moss, Rex/);
  await assert.rejects(asks.ask("ada", "hi", "reply", { conversation: ada, audience: "bot" }, signal), /cannot ask itself/);
  await assert.rejects(asks.ask("ada", "hi", "reply", { conversation: rex, audience: "bot" }, signal), /already waiting on this conversation/);
  let deepest = rex;
  for (let depth = 2; depth < ASK_DEPTH_LIMIT; depth += 1) {
    const next = conversation(`deep${depth}`, { parentId: deepest.id, bot: snapshotBot(bot(`b${depth}`)) });
    fake.add(next); deepest = next;
  }
  await assert.rejects(asks.ask("moss", "hi", "reply", { conversation: deepest, audience: "bot" }, signal), /reached its limit of 4/);
});

test("a failed or stopped reply becomes a tool error naming the bot's thread", async () => {
  const failing = setup(() => new Error("rate limited"));
  const parent = conversation("parent"); failing.fake.add(parent);
  await assert.rejects(failing.asks.ask("ada", "hi", "reply", { conversation: parent, audience: "nora" }, signal), /Ada could not answer: rate limited See its thread \(thread /);
  const silent = setup(() => null);
  silent.fake.add(parent);
  const controller = new AbortController();
  const pending = silent.asks.ask("ada", "hi", "reply", { conversation: parent, audience: "nora" }, controller.signal);
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(pending, /reply was stopped before it finished/);
  assert.ok(silent.fake.commands.some((command) => command.kind === "interrupt"));
});

test("ask_bot wait=reply returns the linked child before the runtime limit while child work continues", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { fake, asks } = setup(() => null);
  const parent = conversation("parent");
  fake.add(parent);
  const waiting = asks.ask("ada", "Do the long task", "reply", { conversation: parent, audience: "nora" }, signal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  t.mock.timers.tick(270_000);
  const result = await waiting;
  assert.equal(result.status, "working");
  assert.ok(result.status === "working");
  assert.equal(result.reason, "timeout");
  assert.ok(fake.conversations.has(result.conversationId));
  assert.equal(fake.commands.some((command) => command.kind === "interrupt"), false);
});
