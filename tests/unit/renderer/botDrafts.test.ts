import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { threadBinding, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { bot } from "../shared/bots/fixtures";
import { GROUP_BINDING } from "@shared/bots/groups";
import { snapshotBot } from "@shared/bots/snapshot";
import { botModelRevertSeed, isBotModelOverride } from "@/components/app/logic/botThreads";

function fixtureWithBots() {
  const f = threadWorkspaceFixture();
  f.deps.boot = { ...f.deps.boot, personalization: { ...f.deps.boot.personalization, bots: { global: [bot("ada")], workspaces: { project: { private: [], hidden: ["ada"] } } } } };
  return f;
}

test("a bot draft opens separately from a plain empty draft and creates a bot thread", async () => {
  const f = fixtureWithBots();
  const store = createThreadWorkspaceStore(f.deps);
  const plain = store.openDraft({ workspaceId: "personal" });
  const withBot = store.openDraft({ workspaceId: "personal", botId: "ada" });
  assert.ok(plain && withBot);
  assert.notEqual(plain, withBot);
  assert.equal(store.openDraft({ workspaceId: "personal", botId: "ada" }), withBot);
  const row = buildThreadNavigation(store.snapshot(), "personal", "all").find((entry) => entry.id === withBot);
  assert.deepEqual(row?.bot, { botId: "ada", name: "Ada", avatar: { seed: 7 } });
  store.setBinding(withBot, threadBinding, "chosen");
  store.setText(withBot, "Hello Ada");
  await store.submit(withBot);
  const create = f.commands.find((command) => command.kind === "create");
  assert.equal(create?.kind === "create" ? create.botId : null, "ada");
  assert.equal(create?.kind === "create" ? create.role : "unexpected", undefined);
});

test("a hidden bot cannot start a draft, and switching to a workspace that hides it falls back to Nora", () => {
  const f = fixtureWithBots();
  const store = createThreadWorkspaceStore(f.deps);
  assert.equal(store.openDraft({ workspaceId: "project", botId: "ada" }), null);
  const id = store.openDraft({ workspaceId: "personal", botId: "ada" });
  assert.ok(id);
  store.selectWorkspace(id, "project");
  assert.equal(store.snapshot().layout.documents.find((entry) => entry.id === id)?.botId, null);
  store.selectBot(id, "ada");
  assert.match(store.snapshot().runtime[id]?.error ?? "", /not available/);
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
  assert.match(store.snapshot().runtime[id]?.error ?? "", /belong to its workspace/);
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
