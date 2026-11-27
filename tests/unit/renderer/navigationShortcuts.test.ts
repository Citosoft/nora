import assert from "node:assert/strict";
import test from "node:test";
import { NAVIGATION_KEYBINDING_COMMAND_IDS } from "@shared/keybindings/commandIds";
import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import { canRunNavigationShortcut, NAVIGATION_SHORTCUT_TARGETS } from "@/components/app/logic/workspace-navigation/shortcuts";

test("every navigation shortcut targets a real rail view or workspace tool", () => {
  const tools = new Set(WORKSPACE_TOOLS.map((tool) => tool.id));
  for (const id of NAVIGATION_KEYBINDING_COMMAND_IDS) {
    const target = NAVIGATION_SHORTCUT_TARGETS[id];
    if (target.kind === "workspace-tool") assert.ok(tools.has(target.tool), id);
  }
});

test("rail views always run; workspace tools need an active workspace that offers them", () => {
  const inbox = NAVIGATION_SHORTCUT_TARGETS["show-inbox"];
  const tasks = NAVIGATION_SHORTCUT_TARGETS["open-workspace-tasks"];
  const issues = NAVIGATION_SHORTCUT_TARGETS["open-workspace-issues"];
  assert.equal(canRunNavigationShortcut(inbox, null), true);
  assert.equal(canRunNavigationShortcut(tasks, null), false);
  assert.equal(canRunNavigationShortcut(tasks, { git: false }), true);
  assert.equal(canRunNavigationShortcut(issues, { git: false }), false);
  assert.equal(canRunNavigationShortcut(issues, { git: true }), true);
});
