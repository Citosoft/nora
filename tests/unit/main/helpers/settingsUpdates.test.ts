import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { createSettingsUpdates } from "@main/helpers/settingsUpdates";

test("queued updates read the latest settings so independent changes are preserved", async () => {
  let settings = structuredClone(DEFAULT_APP_SETTINGS);
  const updates = createSettingsUpdates({ read: () => settings, save: async (next) => { settings = next; return next; }, onSaved() {} });
  await Promise.all([
    updates.update((current) => ({ ...current, confirmSplitViewDelete: false })),
    updates.update((current) => ({ ...current, fileEditorThemeId: "high-contrast" }))
  ]);
  assert.equal(settings.confirmSplitViewDelete, false); assert.equal(settings.fileEditorThemeId, "high-contrast");
});
test("a failed save does not block later updates", async () => {
  let settings = structuredClone(DEFAULT_APP_SETTINGS); let first = true;
  const updates = createSettingsUpdates({ read: () => settings, save: async (next) => { if (first) { first = false; throw new Error("disk"); } settings = next; return next; }, onSaved() {} });
  await assert.rejects(updates.update((current) => current), /disk/);
  await updates.update((current) => ({ ...current, confirmSplitViewDelete: false })); assert.equal(settings.confirmSplitViewDelete, false);
});
