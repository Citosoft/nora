import assert from "node:assert/strict";
import test from "node:test";
import { directWorkspaceToFollow } from "@/components/app/logic/directChats";
import { conversation } from "../main/nora-tools/fixture";
import { snapshotBot } from "@shared/bots/snapshot";
import { bot } from "../shared/bots/fixtures";

const ada = snapshotBot(bot("ada"));
const direct = (scope: "global" | "workspace", workspaceId: string) =>
  conversation("dm", { direct: { botId: "ada", name: "Ada", role: "Helper", avatar: ada.avatar, scope: scope === "global" ? { kind: "global" } : { kind: "workspace", workspaceId }, workspaceId, retiredAt: null } }).direct;
const available = [{ id: "app" }, { id: "site" }];

test("a global bot's chat follows the workspace it is open in", () => {
  assert.equal(directWorkspaceToFollow(direct("global", "app"), "site", available), "site");
  assert.equal(directWorkspaceToFollow(direct("global", "site"), "site", available), null, "already there");
});

test("a chat stays put when it is tied to a workspace, is not a direct chat, or the open workspace cannot run the bot", () => {
  assert.equal(directWorkspaceToFollow(direct("workspace", "app"), "site", available), null);
  assert.equal(directWorkspaceToFollow(undefined, "site", available), null);
  assert.equal(directWorkspaceToFollow(direct("global", "app"), "elsewhere", available), null);
});
