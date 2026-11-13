import assert from "node:assert/strict";
import test from "node:test";
import { buildBotNavigation } from "@/components/app/logic/botNavigation";
import { applyMemberThreadVisibility } from "@/components/app/logic/thread-workspace/navigation";
import type { ThreadNavigationRow, ThreadNavigationStatus } from "@/components/app/types/thread-workspace/ports.types";
import { bot } from "../shared/bots/fixtures";

const row = (id: string, botId: string | null, status: ThreadNavigationStatus, updatedAt: string, kind: "thread" | "draft" = "thread"): ThreadNavigationRow => ({
  id, target: kind === "thread" ? { kind, conversationId: id } : { kind, documentId: id }, title: id, workspaceId: "w", providerKind: "claude",
  bot: botId ? { botId, name: botId, avatar: { seed: 1 } } : null, status, active: false, working: false, unread: false, attention: false,
  pinned: false, selected: false, hasDraft: false, queuedCount: 0, updatedAt });

test("Nora comes first with every bot-less thread, then workspace bots, then global bots", () => {
  const bots = [
    { bot: bot("ada"), origin: "global" as const, overrides: [] },
    { bot: bot("rex", { kind: "workspace", workspaceId: "w", storage: "shared" }), origin: "shared" as const, overrides: [] }
  ];
  const rows = [row("a1", "ada", "Completed", "2026-11-01T00:00:00Z"), row("a2", "ada", "Working", "2026-11-02T00:00:00Z"), row("plain", null, "Needs input", "2026-11-03T00:00:00Z")];
  const groups = buildBotNavigation(bots, rows, "", "Nora");
  assert.deepEqual(groups.map((group) => [group.label, group.items.map((item) => item.id)]), [[null, ["nora"]], ["In Nora", ["rex"]], ["Everywhere", ["ada"]]]);
  assert.deepEqual(groups[0].items[0].threads.map((entry) => entry.id), ["plain"]);
  assert.equal(groups[0].items[0].avatar, null);
  assert.equal(groups[0].items[0].state, "waiting");
  assert.deepEqual(groups[2].items[0].threads.map((entry) => entry.id), ["a2", "a1"]);
  assert.equal(groups[2].items[0].state, "thinking");
  assert.equal(groups[1].items[0].state, "idle");
});

test("drafts never change a face, and search matches name or role including Nora's", () => {
  const bots = [{ bot: bot("ada", { kind: "global" }, { role: "Release manager" }), origin: "global" as const, overrides: [] }];
  const rows = [row("a1", "ada", "Working", "2026-11-01T00:00:00Z"), row("a2", "ada", "Needs approval", "2026-11-01T00:00:00Z"), row("d", "ada", "Delivery unconfirmed", "2026-11-01T00:00:00Z", "draft")];
  assert.equal(buildBotNavigation(bots, rows, "", null)[1].items[0].state, "waiting");
  assert.equal(buildBotNavigation(bots, [rows[2]], "", null)[1].items[0].state, "idle");
  assert.deepEqual(buildBotNavigation(bots, [], "release", null).map((group) => group.id), ["global"]);
  assert.deepEqual(buildBotNavigation(bots, [], "assistant", null).map((group) => group.id), ["built-in"]);
  assert.deepEqual(buildBotNavigation(bots, [], "nobody", null), []);
});

test("hidden member threads drop out of lists unless they need the user", () => {
  const rows = [row("group", null, "Completed", "2026-11-03T00:00:00Z"), { ...row("quiet", "ada", "Completed", "2026-11-02T00:00:00Z"), groupMember: true },
    { ...row("waiting", "rex", "Needs approval", "2026-11-01T00:00:00Z"), groupMember: true, attention: true }];
  assert.deepEqual(applyMemberThreadVisibility(rows, "visible").map((entry) => entry.id), ["group", "quiet", "waiting"]);
  assert.deepEqual(applyMemberThreadVisibility(rows, "hidden").map((entry) => entry.id), ["group", "waiting"]);
});

test("bot info finds the bot's definition, provider label and the groups it belongs to; Nora has none", async () => {
  const { buildBotInfo } = await import("@/components/app/logic/botInfo");
  const ada = { bot: bot("ada"), origin: "global" as const, overrides: [] };
  const item = buildBotNavigation([ada], [], "", "Nora").flatMap((group) => group.items);
  const member = { botId: "ada", name: "Ada", avatar: { seed: 1 } };
  const rows = [{ ...row("old", null, "Completed", "2026-11-01T00:00:00Z"), group: [member] }, { ...row("new", null, "Completed", "2026-11-02T00:00:00Z"), group: [member] },
    { ...row("other", null, "Completed", "2026-11-03T00:00:00Z"), group: [{ ...member, botId: "rex" }] }];
  const info = buildBotInfo(item.find((entry) => entry.id === "ada"), [ada], rows, new Map([[ada.bot.binding.kind, "Claude"]]));
  assert.deepEqual([info?.provider, info?.groups.map((entry) => entry.id)], ["Claude", ["new", "old"]]);
  assert.equal(buildBotInfo(item.find((entry) => entry.id === "nora"), [ada], rows, new Map()), null);
});
