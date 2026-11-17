import assert from "node:assert/strict";
import test from "node:test";
import { GroupCoordinator } from "@main/bots/groups/coordinator";
import { addressedMembers, mentionedMembers, membersByName } from "@main/bots/groups/speakers";
import { selectSpeakers } from "@main/bots/groups/selection";
import { groupPrompt } from "@main/bots/groups/prompt";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ProviderUpdate } from "@main/types/execution/provider.types";
import type { GroupRouter } from "@main/types/bots/groups.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const bots = [bot("ada"), bot("rex"), bot("moss")];
const members = bots.map((entry) => ({ botId: entry.id, name: entry.name, role: entry.role, avatar: entry.avatar }));
const group = conversation("group", { title: "Launch", provider: { kind: "nora", instanceId: "group", model: "group", reasoning: null, permissionPolicy: "group" },
  group: { members, writer: "rex", lead: null, hopLimit: 3 } });

async function runGroup(instruction: string, reply: Parameters<typeof fakeHost>[1], route: GroupRouter = async () => [], interruptAfterMs?: number) {
  const fake = fakeHost(bots, reply);
  fake.add(group);
  let sequence = 0;
  const coordinator = new GroupCoordinator({ host: fake.host, nextId: () => `id${++sequence}`, now: () => "2026-11-13T00:00:00.000Z",
    bot: (_workspace, botId) => bots.find((entry) => entry.id === botId) ?? null, route });
  const updates: ProviderUpdate[] = [];
  const run = { id: "run", conversationId: "group", instruction, state: "starting", attemptId: "a" } as ConversationRun;
  const execution = { snapshot: { conversation: group, runs: [run], items: [], requests: [] } as never, run };
  const started = coordinator.start(execution, (update) => {
    updates.push(update);
    if (update.kind === "item") fake.items.set("group", [...(fake.items.get("group") ?? []), update.item]);
  });
  if (interruptAfterMs !== undefined) setTimeout(() => void coordinator.interrupt(execution), interruptAfterMs);
  await started;
  const items = updates.flatMap((update) => update.kind === "item" ? [update.item] : []);
  const replies = items.filter((item): item is Extract<TimelineItem, { kind: "message" }> => item.kind === "message").map((item) => [item.author?.name, item.text]);
  const milestones = items.filter((item) => item.kind === "milestone").map((item) => item.kind === "milestone" ? item.text : "");
  const finished = updates.find((update) => update.kind === "finished");
  return { fake, replies, milestones, status: finished?.kind === "finished" ? finished.status : null };
}

test("mentions pick speakers in order; whole names only; router names map back to members", () => {
  assert.deepEqual(mentionedMembers("@rex then @Ada, not @Adam", members).map((member) => member.botId), ["rex", "ada"]);
  assert.deepEqual(mentionedMembers("@Ada over to you", members, "ada"), []);
  assert.deepEqual(membersByName(["moss", "@Rex", "zed", "moss"], members, 2).map((member) => member.botId), ["moss", "rex"]);
});

test("mentioned members answer one at a time in their own threads, with the writer getting write access", async () => {
  const result = await runGroup("@Rex and @Ada, plan the launch", (botId, instruction) => {
    assert.match(instruction, /group chat "Launch"/);
    return `${botId} on it`;
  });
  assert.deepEqual(result.replies, [["Rex", "rex on it"], ["Ada", "ada on it"]]);
  assert.equal(result.status, "completed");
  const threads = [...result.fake.conversations.values()].filter((entry) => entry.parentId === "group");
  assert.deepEqual(threads.map((entry) => [entry.bot?.botId, entry.workspace.access]).sort(), [["ada", "read"], ["rex", "write"]]);
});

test("replies that @mention another member hand off until the group's reply limit", async () => {
  const result = await runGroup("@Ada start", (botId) => botId === "ada" ? "@Rex your turn" : botId === "rex" ? "@Moss over to you" : "@Ada back to you");
  assert.deepEqual(result.replies.map(([name]) => name), ["Ada", "Rex", "Moss"]);
  assert.match(result.milestones.at(-1) ?? "", /limit of 3 replies/);
});

test("unaddressed messages go to the router; no pick or no router means a prompt to @mention", async () => {
  const routed = await runGroup("Who can help?", (botId) => `${botId} can`, async () => ["Moss"]);
  assert.deepEqual(routed.replies, [["Moss", "moss can"]]);
  const nobody = await runGroup("Hello", () => "unused", async () => []);
  assert.deepEqual([nobody.replies, nobody.milestones], [[], ["Nobody picked this up. @mention a member to get a reply."]]);
  const broken = await runGroup("Hello", () => "unused", async () => { throw new Error("no AI configured"); });
  assert.match(broken.milestones[0], /could not pick who should answer/);
});

test("Stop interrupts the member who is replying and ends the group run", async () => {
  const result = await runGroup("@Ada think hard", () => null, async () => [], 5);
  assert.equal(result.status, "interrupted");
  assert.ok(result.fake.commands.some((command) => command.kind === "interrupt"));
});

test("@everyone asks every member in order without routing; members cannot @everyone each other", () => {
  assert.deepEqual(addressedMembers("@everyone thoughts?", members).map((member) => member.botId), ["ada", "rex", "moss"]);
  assert.deepEqual(addressedMembers("@everyones thoughts and @Rex", members).map((member) => member.botId), ["rex"]);
  assert.deepEqual(mentionedMembers("@everyone over to you", members, "ada"), []);
});

test("the lead answers what the router cannot place; without a lead the notice explains why nobody replied", async () => {
  const signal = new AbortController().signal;
  const led = { ...group.group!, lead: "moss" };
  const route = (names: string[] | Error): GroupRouter => async () => { if (names instanceof Error) throw names; return names; };
  const speakers = async (descriptor: typeof led, router: GroupRouter, message = "hi") =>
    (await selectSpeakers({ message, group: descriptor, route: router, signal })).speakers.map((member) => member.botId);
  assert.deepEqual(await speakers(led, route([])), ["moss"]);
  assert.deepEqual(await speakers(led, route(new Error("no AI"))), ["moss"]);
  assert.deepEqual(await speakers(led, route(["Zed"])), ["moss"]);
  assert.deepEqual(await speakers(led, route(["Ada"])), ["ada"]);
  assert.deepEqual(await speakers(led, route(["Ada"]), "@Rex please"), ["rex"]);
  assert.match((await selectSpeakers({ message: "hi", group: { ...led, lead: null }, route: route(new Error("no AI")), signal })).notice ?? "", /could not pick/);
});

test("a member's prompt names the lead and points at chat_history when older messages are cut", () => {
  const led = { ...group, group: { ...group.group!, lead: "ada" } };
  const long: TimelineItem[] = [{ kind: "message", id: "u", runId: "r", createdAt: "t", role: "user", text: "x".repeat(50_000), complete: true }];
  assert.match(groupPrompt(led, members, members[0], long), /You lead this group/);
  const rex = groupPrompt(led, members, members[1], long);
  assert.match(rex, /Ada leads this group/);
  assert.match(rex, /earlier messages omitted; call chat_history/);
});
