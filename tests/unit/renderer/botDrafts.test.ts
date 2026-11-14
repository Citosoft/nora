import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { bot } from "../shared/bots/fixtures";
import { DIRECT_BINDING, GROUP_BINDING } from "@shared/bots/chats";
import { snapshotBot } from "@shared/bots/snapshot";
import { botModelRevertSeed, isBotModelOverride } from "@/components/app/logic/botThreads";

function fixtureWithBots() {
  const f = threadWorkspaceFixture();
  f.deps.boot = { ...f.deps.boot, personalization: { ...f.deps.boot.personalization, bots: { global: [bot("ada")], workspaces: { project: { private: [], hidden: ["ada"] } } } } };
  return f;
}

test("a bot's direct chat opens one draft per bot, stays out of workspace lists and is created in its home workspace", async () => {
  const f = fixtureWithBots();
  const store = createThreadWorkspaceStore(f.deps);
  const plain = store.openDraft({ workspaceId: "personal" });
  const chat = store.openDirect("personal", "ada");
  assert.ok(plain && chat);
  assert.notEqual(plain, chat);
  assert.equal(store.openDirect("personal", "ada"), chat);
  assert.equal(buildThreadNavigation(store.snapshot(), "personal", "all").some((entry) => entry.id === chat), false);
  assert.deepEqual(store.snapshot().layout.documents.find((entry) => entry.id === chat)?.provider, DIRECT_BINDING);
  store.setBinding(chat, DIRECT_BINDING, "inherited");
  store.setText(chat, "Hello Ada");
  await store.submit(chat);
  const create = f.commands.find((command) => command.kind === "create");
  assert.ok(create?.kind === "create");
  assert.deepEqual([create.direct, create.title, create.workspace.projectId, create.role, create.botId],
    [{ botId: "ada", workspaceId: "personal" }, "Ada", "personal", undefined, undefined]);
});

test("a bot hidden in a workspace cannot be messaged from it, and a chat draft cannot move workspaces", () => {
  const f = fixtureWithBots();
  const store = createThreadWorkspaceStore(f.deps);
  assert.equal(store.openDirect("project", "ada"), null);
  assert.match(store.snapshot().error ?? "", /not available/);
  const id = store.openDirect("personal", "ada");
  assert.ok(id);
  store.selectWorkspace(id, "project");
  assert.match(store.snapshot().runtime[id]?.error ?? "", /chooses where its bots work/);
});

test("a group draft uses the coordinator's binding, sends its members and stays in its workspace", async () => {
  const f = fixtureWithBots();
  f.deps.boot = { ...f.deps.boot, personalization: { ...f.deps.boot.personalization, bots: { global: [bot("ada"), bot("rex")], workspaces: {} } } };
  const store = createThreadWorkspaceStore(f.deps);
  assert.equal(store.openDraft({ workspaceId: "personal", group: { botIds: ["ada", "zed"], writer: null, lead: null } }), null);
  const id = store.openDraft({ workspaceId: "personal", group: { botIds: ["ada", "rex"], writer: "rex", lead: "ada" } });
  assert.ok(id);
  assert.notEqual(store.openDraft({ workspaceId: "personal", group: { botIds: ["ada", "rex"], writer: "rex", lead: "ada" } }), id);
  const row = buildThreadNavigation(store.snapshot(), "personal", "all").find((entry) => entry.id === id);
  assert.deepEqual(row?.group?.map((member) => member.botId), ["ada", "rex"]);
  store.selectWorkspace(id, "project");
  assert.match(store.snapshot().runtime[id]?.error ?? "", /chooses where its bots work/);
  store.setBinding(id, GROUP_BINDING, "inherited");
  store.setText(id, "@Ada plan it");
  await store.submit(id);
  const create = f.commands.find((command) => command.kind === "create");
  assert.ok(create?.kind === "create");
  assert.deepEqual([create.group, create.provider.kind, create.role, create.botId], [{ botIds: ["ada", "rex"], writer: "rex", lead: "ada" }, "nora", undefined, undefined]);
});

test("reverting to a bot's model keeps the thread's policy only on the same provider", () => {
  const snapshot = snapshotBot(bot("ada"));
  const sameProvider = { kind: "claude" as const, instanceId: "claude", model: "claude-sonnet-5-5", reasoning: "low", permissionPolicy: "plan" };
  assert.deepEqual(botModelRevertSeed(snapshot, sameProvider), { kind: "claude", instanceId: "claude", model: "claude-opus-5-5", reasoning: null, permissionPolicy: "plan" });
  assert.equal(botModelRevertSeed(snapshot, { ...sameProvider, kind: "codex", instanceId: "codex" }).permissionPolicy, null);
  assert.equal(isBotModelOverride(snapshot, sameProvider), true);
});
