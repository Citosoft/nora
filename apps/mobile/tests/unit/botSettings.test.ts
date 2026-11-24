import { describe, expect, it } from "vitest";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import { routes } from "@/navigation/routes";
import { editBotDraft, findEditableBot, newBotDraft, parseBotManagementIntent } from "@/state/botSettings";
import { notifyBotsChanged, subscribeToBotChanges } from "@/state/botSettingsChanges";

const global: BotDefinition = { id: "reviewer", name: "Reviewer", role: "Review code", instructions: "Check for bugs", avatar: { seed: 8, palette: "teal" },
  revision: 4, scope: { kind: "global" }, binding: { kind: "codex", instanceId: "codex", model: "test", reasoning: null, permissionPolicy: null } };
const shared: BotDefinition = { ...global, name: "Shared", scope: { kind: "workspace", workspaceId: "work/one", storage: "shared" } };
const privateBot: BotDefinition = { ...shared, name: "Private override", scope: { kind: "workspace", workspaceId: "work/one", storage: "private" } };

const intentFromHref = (href: string) => {
  const url = new URL(href, "https://nora.test");
  return parseBotManagementIntent(url.searchParams.get("botId") ?? "", url.searchParams.get("create") ?? "", url.searchParams.get("workspaceId") ?? "");
};

describe("direct bot management entry points", () => {
  it("opens the requested bot and workspace without confusing a global bot with the same id", () => {
    const intent = intentFromHref(routes.editBot("my computer", shared.id, shared.scope));
    expect(intent).toEqual({ kind: "edit", botId: "reviewer", scope: { kind: "workspace", workspaceId: "work/one" } });
    expect(routes.editBot("my computer", global.id, global.scope)).toBe("/runtimes/my%20computer/bots?botId=reviewer");
    expect(intentFromHref(routes.editBot("rt", global.id, global.scope))).toEqual({ kind: "edit", botId: "reviewer", scope: { kind: "global" } });
  });

  it("uses the effective private override for sidebar edits regardless of catalog ordering", () => {
    expect(findEditableBot([global, shared, privateBot], "reviewer", { kind: "workspace", workspaceId: "work/one" })).toBe(privateBot);
    expect(findEditableBot([privateBot, shared, global], "reviewer", { kind: "global" })).toBe(global);
    expect(findEditableBot([global, shared], "reviewer", { kind: "workspace", workspaceId: "work/one" })).toBe(shared);
    expect(findEditableBot([global], "reviewer", { kind: "workspace", workspaceId: "work/one" })).toBeNull();
  });

  it("creates private bots in the selected workspace and global bots when all workspaces are selected", () => {
    expect(intentFromHref(routes.createBot("rt", "work/one"))).toEqual({ kind: "create", workspaceId: "work/one" });
    expect(newBotDraft("unique-id", 42, "work/one").scope).toEqual({ kind: "workspace", workspaceId: "work/one", storage: "private" });
    expect(intentFromHref(routes.createBot("rt"))).toEqual({ kind: "create", workspaceId: null });
    expect(newBotDraft("unique-id", 42).scope).toEqual({ kind: "global" });
    expect(intentFromHref(routes.manageBots("rt"))).toEqual({ kind: "list" });
  });

  it("keeps the bot's identity, avatar and revision when editing from a shortcut", () => {
    const draft = editBotDraft(privateBot);
    expect(draft.id).toBe(privateBot.id);
    expect(draft.avatar).toEqual(privateBot.avatar);
    expect(draft.scope).toEqual(privateBot.scope);
    expect(draft.revision).toBe(privateBot.revision);
    expect(draft.instructions).toBe(privateBot.instructions);
  });
});

describe("refreshing mounted bot lists after a save", () => {
  it("refreshes only the affected computer and removes subscriptions cleanly", () => {
    const calls: string[] = [];
    const offFirst = subscribeToBotChanges("first", () => calls.push("first"));
    const offSecond = subscribeToBotChanges("second", () => calls.push("second"));
    const offOther = subscribeToBotChanges("first", () => calls.push("other first listener"));
    notifyBotsChanged("first");
    expect(calls).toEqual(["first", "other first listener"]);
    offFirst(); offOther();
    notifyBotsChanged("first");
    notifyBotsChanged("second");
    expect(calls).toEqual(["first", "other first listener", "second"]);
    offSecond();
    notifyBotsChanged("second");
    expect(calls).toHaveLength(3);
  });
});
