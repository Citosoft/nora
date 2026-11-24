import assert from "node:assert/strict";
import test from "node:test";
import { emptyBotSettings } from "@shared/bots/catalog";
import { findChatBot, NORA_CHAT, noraChatModel } from "@shared/bots/noraChat";
import { findDirectChat } from "@shared/bots/directChats";
import { bot } from "./fixtures";
import { conversation } from "../../main/nora-tools/fixture";

test("Nora is a direct-chat partner in every workspace, alongside the workspace's configured bots", () => {
  const settings = { ...emptyBotSettings(), global: [bot("ada")] };
  assert.equal(findChatBot(settings, "app", [], "nora"), NORA_CHAT);
  assert.equal(findChatBot(undefined, "site", [], "nora"), NORA_CHAT);
  assert.equal(findChatBot(settings, "app", [], "ada")?.name, "Ada");
  assert.equal(findChatBot(settings, "app", [], "grace"), null);
});

test("Nora's chat is found like any global bot's, so it opens instead of starting a second one", () => {
  const chat = conversation("dm", { direct: { botId: "nora", name: "Nora", role: NORA_CHAT.role, avatar: NORA_CHAT.avatar, scope: { kind: "global" }, workspaceId: "app" } });
  assert.equal(findDirectChat([{ conversation: chat, latestRun: null, queuedCount: 0, pendingRequestCount: 0 }], NORA_CHAT)?.conversation.id, "dm");
});

test("Nora's chat runs on its own model, else the new-thread default, else leaves the choice to the runtime", () => {
  const pinned = { kind: "codex" as const, instanceId: "codex", model: "gpt" };
  const thread = { kind: "claude" as const, instanceId: "claude", model: "opus" };
  assert.deepEqual(noraChatModel({ noraChatModel: pinned, threadModel: thread }), pinned);
  assert.deepEqual(noraChatModel({ threadModel: thread }), thread);
  assert.equal(noraChatModel({}), null);
});
