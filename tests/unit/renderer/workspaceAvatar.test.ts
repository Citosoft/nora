import assert from "node:assert/strict";
import test from "node:test";
import { workspaceAvatarColor, workspaceInitials } from "@/components/app/logic/workspace-navigation/avatar";

test("workspace initials use two letters across names, separators, Unicode and empty names", () => {
  for (const [name, initials] of [
    ["Nora", "NO"], ["Nora Desktop", "ND"], ["my-client-app", "MA"],
    ["  personal_workspace  ", "PW"], ["Équipe Créative", "ÉC"],
    ["東京", "東京"], ["🚀 Launch Pad", "LP"], ["A", "AA"], ["---", "WS"], ["", "WS"]
  ]) assert.equal(workspaceInitials(name), initials);
});

test("workspace colors depend only on stable identity and provide multiple distinct colors", () => {
  const ids = ["personal", "nora", "website", "client", "design", "notes"];
  const colors = new Map(ids.map((id) => [id, workspaceAvatarColor(id)]));
  for (const id of ids.reverse()) assert.equal(workspaceAvatarColor(id), colors.get(id));
  assert.ok(new Set(colors.values()).size >= 4);
  assert.equal(typeof workspaceAvatarColor(""), "string");
});
