import { buildMacApplicationMenuTemplate } from "@main/helpers/buildMacApplicationMenuTemplate";
import type { MacApplicationMenuSyncPayload } from "@shared/types/macApplicationMenu.types";
import type { MenuItemConstructorOptions } from "electron";
import assert from "node:assert/strict";
import test from "node:test";

const payload: MacApplicationMenuSyncPayload = {
  phase: "pre-launch",
  hasActiveWorkspace: false,
  canOpenProjectInIde: false,
  activeProjectRoot: null,
  preferredIde: null,
  idesOrderedForMenu: [],
  defaultIdeId: null,
  recentWorkspaces: []
};

function findMenu(template: MenuItemConstructorOptions[], label: string): MenuItemConstructorOptions {
  const item = template.find((entry) => entry.label === label);
  assert.ok(item, `Expected ${label} menu to exist.`);
  return item;
}

test("mac application Help menu includes Resource Monitor", () => {
  const template = buildMacApplicationMenuTemplate(() => null, payload, () => null);
  const helpMenu = findMenu(template, "Help");
  assert.ok(Array.isArray(helpMenu.submenu));

  const labels = helpMenu.submenu
    .filter((item): item is MenuItemConstructorOptions => !("type" in item))
    .map((item) => item.label);

  assert.ok(labels.includes("Resource Monitor"));
});

test("mac application View menu exposes native reload roles as a recovery path", () => {
  const template = buildMacApplicationMenuTemplate(() => null, payload, () => null);
  const viewMenu = findMenu(template, "View");
  assert.ok(Array.isArray(viewMenu.submenu));

  const roles = viewMenu.submenu.map((item) => item.role).filter((role) => role !== undefined);

  assert.deepEqual(roles, ["reload", "forceReload", "toggleDevTools"]);
});

test("mac application menu shows resolved keybindings without registering them natively", () => {
  const template = buildMacApplicationMenuTemplate(() => null, payload, (commandId) =>
    commandId === "toggle-workspace-sidebar" ? "CmdOrCtrl+Alt+B" : null
  );
  const viewMenu = findMenu(template, "View");
  assert.ok(Array.isArray(viewMenu.submenu));
  const toggle = viewMenu.submenu.find((item) => item.label === "Toggle Sidebar");
  assert.equal(toggle?.accelerator, "CmdOrCtrl+Alt+B");
  assert.equal(toggle?.registerAccelerator, false);
  const unbound = viewMenu.submenu.find((item) => item.label === "Toggle Changes Sidebar");
  assert.equal(unbound?.accelerator, undefined);
});
