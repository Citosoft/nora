import assert from "node:assert/strict";
import test from "node:test";
import { createAskOperations, ASK_DEPTH_LIMIT } from "@main/nora-tools/operations/asks";
import { snapshotBot } from "@shared/bots/snapshot";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const bots = [bot("ada"), bot("rex"), bot("moss")];
const boot = { environmentId: "local", cursor: 0, sharedBots: [], providers: [], workspaces: [], noraTools: noraToolsStatus("idle"),
  personalization: { defaultRole: null, workspaceRoles: {}, bots: { global: bots, workspaces: {} } } } as NativeBoot;
const setup = (reply: Parameters<typeof fakeHost>[1]) => {
  const fake = fakeHost(bots, reply);
  let sequence = 0;
  const asks = createAskOperations({ host: fake.host, nextId: () => `id${++sequence}`, boot: () => boot, saveBot: async () => {}, memory: {} as never });
  return { fake, asks };
};
const signal = new AbortController().signal;

test("ask_bot runs the bot in a read-only child thread, frames who is asking, and continues the same thread next time", async () => {
  const { fake, asks } = setup((botId, instruction) => `${botId} heard: ${instruction.split("\n").at(-1)}`);
  const parent = conversation("parent", { title: "Release" });
  fake.add(parent);
  const first = await asks.ask("Rex", "Is the build green?", { conversation: parent, audience: "nora" }, signal);
  assert.equal(first.botName, "Rex");
  assert.equal(first.reply, "rex heard: Is the build green?");
  const child = fake.conversations.get(first.conversationId);
  assert.deepEqual([child?.parentId, child?.bot?.botId, child?.workspace.access, child?.provider.permissionPolicy], ["parent", "rex", "read", "default"]);
  const submit = fake.commands.find((command) => command.kind === "submit");
  assert.match(submit?.kind === "submit" ? submit.instruction : "", /^Nora, on the user's behalf asks you \(in thread "Release"\)/);
  const second = await asks.ask("rex", "And now?", { conversation: parent, audience: "nora" }, signal);
  assert.equal(second.conversationId, first.conversationId);
});

test("ask_bot refuses unknown bots, self-asks, loops and over-long chains", async () => {
  const { fake, asks } = setup(() => "ok");
  const root = conversation("root");
  const ada = conversation("ada-thread", { parentId: "root", bot: snapshotBot(bots[0]) });
  const rex = conversation("rex-thread", { parentId: "ada-thread", bot: snapshotBot(bots[1]) });
  for (const entry of [root, ada, rex]) fake.add(entry);
  await assert.rejects(asks.ask("Zed", "hi", { conversation: root, audience: "nora" }, signal), /No bot called "Zed" here. Available: Ada, Moss, Rex/);
  await assert.rejects(asks.ask("ada", "hi", { conversation: ada, audience: "bot" }, signal), /cannot ask itself/);
  await assert.rejects(asks.ask("ada", "hi", { conversation: rex, audience: "bot" }, signal), /already waiting on this conversation/);
  let deepest = rex;
  for (let depth = 2; depth < ASK_DEPTH_LIMIT; depth += 1) {
    const next = conversation(`deep${depth}`, { parentId: deepest.id, bot: snapshotBot(bot(`b${depth}`)) });
    fake.add(next); deepest = next;
  }
  await assert.rejects(asks.ask("moss", "hi", { conversation: deepest, audience: "bot" }, signal), /reached its limit of 4/);
});

test("a failed or stopped reply becomes a tool error naming the bot's thread", async () => {
  const failing = setup(() => new Error("rate limited"));
  const parent = conversation("parent"); failing.fake.add(parent);
  await assert.rejects(failing.asks.ask("ada", "hi", { conversation: parent, audience: "nora" }, signal), /Ada could not answer: rate limited See its thread \(thread /);
  const silent = setup(() => null);
  silent.fake.add(parent);
  const controller = new AbortController();
  const pending = silent.asks.ask("ada", "hi", { conversation: parent, audience: "nora" }, controller.signal);
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(pending, /reply was stopped before it finished/);
  assert.ok(silent.fake.commands.some((command) => command.kind === "interrupt"));
});
