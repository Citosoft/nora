import assert from "node:assert/strict";
import test from "node:test";
import { snapshotBot } from "@shared/bots/snapshot";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import { fixture, provider } from "./fixture";
import { bot } from "../../shared/bots/fixtures";

const create = (botId: string | undefined, extra: Partial<Extract<ConversationCommand, { kind: "create" }>> = {}): Extract<ConversationCommand, { kind: "create" }> => ({
  kind: "create", commandId: "create", conversationId: "conversation", title: "Hi", parentId: null, provider,
  workspace: { environmentId: "local", projectId: "project", checkoutId: "c", path: "/test/c", branch: "main", access: "write" },
  ...(botId ? { botId } : {}), ...extra });

test("bot threads freeze the bot snapshot, carry no role, and survive restart", (t) => {
  const f = fixture(t);
  const snapshot = snapshotBot(bot("ada"));
  f.engine.execute(create("ada"), { bot: snapshot, role: { id: "developer" } });
  assert.deepEqual(f.snapshot().conversation.bot, snapshot);
  assert.equal(f.snapshot().conversation.role, null);
  f.restart();
  assert.deepEqual(f.snapshot().conversation.bot, snapshot);
});

test("bot creation rejects a role alongside a bot and an unresolved bot", (t) => {
  const f = fixture(t);
  const snapshot = snapshotBot(bot("ada"));
  assert.throws(() => f.engine.execute(create("ada", { role: { id: "writing" } }), { bot: snapshot }), /cannot also carry a role/);
  assert.throws(() => f.engine.execute(create("ada")), /could not be resolved/);
  assert.throws(() => f.engine.execute(create("rex"), { bot: snapshot }), /could not be resolved/);
  assert.throws(() => f.engine.execute(create(undefined), { bot: snapshot }), /could not be resolved/);
  f.engine.execute(create(undefined), { role: { id: "writing" } });
  assert.equal(f.snapshot().conversation.bot, undefined);
  assert.equal(f.snapshot().conversation.role?.selection.id, "writing");
});

test("group chats freeze their members, never write themselves, and need the coordinator's provider", (t) => {
  const f = fixture(t);
  const members = [bot("ada"), bot("rex")].map((entry) => ({ botId: entry.id, name: entry.name, role: entry.role, avatar: entry.avatar }));
  const descriptor = { members, writer: "rex", lead: "ada", hopLimit: 4 };
  const nora = { kind: "nora" as const, instanceId: "group", model: "group", reasoning: null, permissionPolicy: "group" };
  const command = { ...create(undefined), provider: nora, group: { botIds: ["ada", "rex"], writer: "rex", lead: "ada" } };
  assert.throws(() => f.engine.execute({ ...command, provider }, { group: descriptor }), /members could not be resolved/);
  assert.throws(() => f.engine.execute(command), /members could not be resolved/);
  assert.throws(() => f.engine.execute({ ...command, botId: "ada" }, { group: descriptor, bot: snapshotBot(bot("ada")) }), /cannot also be a bot thread/);
  f.engine.execute(command, { group: descriptor, role: { id: "developer" } });
  const created = f.snapshot().conversation;
  assert.deepEqual(created.group, descriptor);
  assert.equal(created.workspace.access, "read");
  assert.equal(created.role, null);
});

test("direct chats are read-only, need the coordinator, and only change their working workspace within the bot's scope", (t) => {
  const f = fixture(t);
  const ada = bot("ada");
  const descriptor = { botId: "ada", name: ada.name, role: ada.role, avatar: ada.avatar, scope: { kind: "global" as const }, workspaceId: "project" };
  const nora = { kind: "nora" as const, instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" };
  const command = { ...create(undefined), provider: nora, direct: { botId: "ada", workspaceId: "project" } };
  assert.throws(() => f.engine.execute({ ...command, provider }, { direct: descriptor }), /bot for this chat could not be resolved/);
  assert.throws(() => f.engine.execute(command), /bot for this chat could not be resolved/);
  assert.throws(() => f.engine.execute({ ...command, role: { id: "writing" } }, { direct: descriptor }), /cannot also be a group/);
  assert.throws(() => f.engine.execute(command, { direct: { ...descriptor, scope: { kind: "workspace", workspaceId: "elsewhere" } } }), /own workspace/);
  f.engine.execute(command, { direct: descriptor, role: { id: "developer" } });
  const created = f.snapshot().conversation;
  assert.deepEqual([created.direct, created.workspace.access, created.role], [descriptor, "read", null]);
  f.engine.execute({ kind: "set-direct-workspace", commandId: "move", conversationId: created.id, workspaceId: "other" });
  assert.equal(f.snapshot().conversation.direct?.workspaceId, "other");
  assert.equal(f.snapshot().conversation.updatedAt, created.updatedAt, "choosing a workspace is not activity");
});
