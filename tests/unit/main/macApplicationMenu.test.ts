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
  const template = buildMacApplicationMenuTemplate(() => null, payload);
  const helpMenu = findMenu(template, "Help");
  assert.ok(Array.isArray(helpMenu.submenu));

  const labels = helpMenu.submenu
    .filter((item): item is MenuItemConstructorOptions => !("type" in item))
    .map((item) => item.label);

  assert.ok(labels.includes("Resource Monitor"));
});
