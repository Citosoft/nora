import assert from "node:assert/strict";
import test from "node:test";
import { effectiveBots, findEffectiveBot, knownBotIds, newBotId } from "@shared/bots/catalog";
import { putStoredBot, removeStoredBot, setBotHidden, storedBot } from "@shared/bots/settingsMutations";
import { botDefinitionSchema, botSettingsSchema } from "@shared/bots/contracts";
import type { BotSettings } from "@shared/types/bots/bots.types";
import { bot } from "./fixtures";

const shared = (id: string) => bot(id, { kind: "workspace", workspaceId: "w", storage: "shared" });
const personal = (id: string) => bot(id, { kind: "workspace", workspaceId: "w", storage: "private" });

test("private overrides shared overrides global, and hidden bots drop out per workspace", () => {
  const settings: BotSettings = { global: [bot("ada"), bot("rex")], workspaces: { w: { private: [personal("ada")], hidden: ["rex"] } } };
  const sets = [{ workspaceId: "w", bots: [shared("ada"), shared("moss")], problems: [] }];
  const workspace = effectiveBots(settings, "w", sets);
  assert.deepEqual(workspace.map((entry) => [entry.bot.id, entry.origin, entry.overrides]), [["ada", "private", ["global", "shared"]], ["moss", "shared", []]]);
  assert.deepEqual(effectiveBots(settings, "other", sets).map((entry) => entry.bot.id), ["ada", "rex"]);
  assert.deepEqual(effectiveBots(settings, null, sets).map((entry) => entry.origin), ["global", "global"]);
  assert.equal(findEffectiveBot(settings, "w", sets, "rex"), null);
  assert.equal(findEffectiveBot(settings, "w", sets, "ada")?.scope.kind, "workspace");
  assert.deepEqual(effectiveBots(undefined, "toString", []), []);
});

test("new ids are readable slugs that avoid existing ids", () => {
  assert.equal(newBotId("Ada Lovelace!", new Set()), "ada-lovelace");
  assert.equal(newBotId("Ada", new Set(["ada", "ada-2"])), "ada-3");
  assert.equal(newBotId("🤖", new Set()), "bot");
  assert.equal(newBotId("Zoë", new Set()), "zoe");
});

test("stored bot mutations keep layers separate and prune empty workspace entries", () => {
  let settings = putStoredBot(undefined, bot("ada"));
  settings = putStoredBot(settings, personal("rex"));
  settings = setBotHidden(settings, "w", "ada", true);
  assert.ok(botSettingsSchema.safeParse(settings).success);
  assert.equal(storedBot(settings, { kind: "workspace", workspaceId: "w", storage: "private" }, "rex")?.id, "rex");
  assert.equal(storedBot(settings, { kind: "workspace", workspaceId: "w", storage: "shared" }, "rex"), null);
  settings = putStoredBot(settings, bot("ada", { kind: "global" }, { name: "Ada 2" }));
  assert.deepEqual(settings.global.map((entry) => entry.name), ["Ada 2"]);
  settings = removeStoredBot(settings, { kind: "workspace", workspaceId: "w", storage: "private" }, "rex");
  settings = setBotHidden(settings, "w", "ada", false);
  assert.deepEqual(settings.workspaces, {});
  assert.throws(() => putStoredBot(settings, shared("moss")), /stored in their workspace/);
});

test("bot definitions reject unsafe ids and oversized fields", () => {
  assert.equal(botDefinitionSchema.safeParse(bot("../escape")).success, false);
  assert.equal(botDefinitionSchema.safeParse(bot("Upper")).success, false);
  assert.equal(botDefinitionSchema.safeParse(bot("ok", { kind: "global" }, { name: " " })).success, false);
  assert.equal(botDefinitionSchema.safeParse(bot("ok", { kind: "global" }, { instructions: "a".repeat(8001) })).success, false);
  assert.equal(botDefinitionSchema.safeParse({ ...bot("ok"), permissions: "all" }).success, false);
});

test("known ids cover global bots and the workspace's shared and private bots", () => {
  const settings: BotSettings = { global: [bot("ada")], workspaces: { w: { private: [personal("rex")], hidden: [] }, other: { private: [bot("zed")], hidden: [] } } };
  assert.deepEqual([...knownBotIds(settings, "w", [{ workspaceId: "w", bots: [shared("moss")], problems: [] }])].sort(), ["ada", "moss", "nora", "rex"]);
  assert.deepEqual([...knownBotIds(settings, null, [])].sort(), ["ada", "nora"]);
});
