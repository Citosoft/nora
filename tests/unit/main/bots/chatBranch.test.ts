import assert from "node:assert/strict";
import test from "node:test";
import { startChatBranch } from "@main/bots/chats/branch";
import { branchPrompt } from "@main/bots/chats/branchPrompt";
import { chatBranchOrigin } from "@shared/bots/branches/origin";
import type { TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const ada = bot("ada");
const grace = bot("grace");
const ref = (projectId: string): WorkspaceRef => ({ projectId, environmentId: "local", checkoutId: projectId, path: `/${projectId}`, branch: "main", access: "read" });
const workspaces = [{ id: "app", name: "App", workspace: ref("app") }, { id: "site", name: "Site", workspace: ref("site") }];
const direct: DirectDescriptor = { botId: "ada", name: "Ada", role: ada.role, avatar: ada.avatar, scope: { kind: "global" }, workspaceId: "site" };
const nora = { kind: "nora", instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" } as const;
const said = (id: string, role: "user" | "assistant", text: string): TimelineItem => ({ kind: "message", id, runId: id, createdAt: "", role, text, complete: true });
const ids = { createCommandId: "c1", conversationId: "side", submitCommandId: "s1", runId: "r1" };

function setup() {
  const fake = fakeHost([ada, grace], () => null);
  fake.add(conversation("dm", { title: "Ada", provider: nora, direct }));
  fake.items.set("dm", [said("u1", "user", "Plan the launch"), said("a1", "assistant", "Here is a plan"), said("u2", "user", "Unrelated later")]);
  const names: string[] = [];
  const deps = { name: async (message: string) => { names.push(message); return "Launch timeline"; }, host: fake.host, nextId: () => "unused", bot: (_: string, botId: string) => botId === "ada" ? ada : botId === "grace" ? grace : null, workspaces: () => workspaces };
  return { fake, deps, names };
}

test("a direct chat's branch is a write-enabled branch thread where the chat works, seeded with the chat up to the chosen message", async () => {
  const { fake, deps } = setup();
  const id = await startChatBranch(deps, { chatId: "dm", botId: "ada", fromItemId: "a1", text: "Tighten the timeline", ids });
  assert.equal(id, "side");
  const thread = fake.conversations.get("side");
  assert.deepEqual([thread?.parentId, thread?.bot?.botId, thread?.workspace.projectId, thread?.workspace.access], ["dm", "ada", "site", "write"]);
  // The branch keeps where it started, so it can show it after the chat moves on.
  assert.deepEqual(thread?.chatBranch?.from && [thread.chatBranch.from.itemId, thread.chatBranch.from.role, thread.chatBranch.from.authorName, thread.chatBranch.from.excerpt],
    ["a1", "assistant", "Nora", "Here is a plan"]);
  const submit = fake.commands.find((command) => command.kind === "submit");
  assert.ok(submit?.kind === "submit");
  assert.equal(submit.chatText, "Tighten the timeline");
  assert.match(submit.instruction, /Here is a plan/);
  assert.doesNotMatch(submit.instruction, /Unrelated later/);
  // Retrying with the same identities does not create a second thread.
  await startChatBranch(deps, { chatId: "dm", botId: "ada", fromItemId: "a1", text: "Tighten the timeline", ids });
  assert.equal(fake.commands.filter((command) => command.kind === "create").length, 1);
});

test("a group member's branch works in the group's workspace with that member's access, and only members can branch", async () => {
  const { fake, deps } = setup();
  fake.add(conversation("group", { title: "Team", provider: { ...nora, instanceId: "group" }, workspace: ref("app"),
    group: { members: [{ botId: "grace", name: "Grace", role: "", avatar: grace.avatar }], writer: null, lead: null, hopLimit: 4 } as never }));
  await startChatBranch(deps, { chatId: "group", botId: "grace", fromItemId: null, text: "Just us", ids });
  assert.deepEqual([fake.conversations.get("side")?.workspace.projectId, fake.conversations.get("side")?.workspace.access], ["app", "read"]);
  assert.deepEqual(fake.conversations.get("side")?.chatBranch, { from: null });
  await assert.rejects(startChatBranch(deps, { chatId: "group", botId: "ada", fromItemId: null, text: "Hi", ids: { ...ids, conversationId: "other" } }), /not a member/);
});

test("a blank branch carries no chat, and a missing starting message is refused", () => {
  assert.doesNotMatch(branchPrompt("Ada", [said("u1", "user", "secret")], null, "Hello"), /secret/);
  assert.throws(() => branchPrompt("Ada", [], "gone", "Hello"), /no longer in the chat/);
});

test("a branch's saved origin names who wrote the message and keeps a bounded excerpt", () => {
  const origin = chatBranchOrigin({ id: "u1", role: "user", text: `  ${"x".repeat(700)}  `, createdAt: "2026-11-15T09:00:00.000Z", author: undefined });
  assert.equal(origin.authorName, null);
  assert.equal(origin.excerpt.length, 600);
  assert.ok(origin.excerpt.endsWith("…"));
  assert.equal(chatBranchOrigin({ id: "a1", role: "assistant", text: "Hi", createdAt: "", author: { kind: "bot", botId: "ada", name: "Ada", avatar: ada.avatar } }).authorName, "Ada");
});

test("a branch keeps the name generated when it was opened, and a branch without one is renamed from its first message", async () => {
  const named = setup();
  await startChatBranch(named.deps, { chatId: "dm", botId: "ada", fromItemId: "a1", text: "Tighten it", title: "Launch plan follow-up", ids });
  assert.equal(named.fake.conversations.get("side")?.title, "Launch plan follow-up");
  assert.deepEqual(named.names, []);
  const blank = setup();
  await startChatBranch(blank.deps, { chatId: "dm", botId: "ada", fromItemId: null, text: "Tighten the launch timeline please", ids });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(blank.names, ["Tighten the launch timeline please"]);
  const rename = blank.fake.commands.find((command) => command.kind === "rename");
  assert.equal(rename?.kind === "rename" ? rename.title : null, "Launch timeline");
});
