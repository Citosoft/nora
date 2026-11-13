import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { withMainOwnedSettings } from "@main/helpers/mainOwnedSettings";

test("renderer settings saves keep main's personalization so a stale snapshot cannot revert roles or the thread model", () => {
  const current = structuredClone(DEFAULT_APP_SETTINGS);
  current.personalization = { defaultRole: { id: "writing" }, workspaceRoles: {}, threadModel: { kind: "claude", instanceId: "local", model: "opus" } };
  const fromRenderer = { ...structuredClone(DEFAULT_APP_SETTINGS), confirmSplitViewDelete: false };
  const saved = withMainOwnedSettings(current, fromRenderer, DEFAULT_APP_SETTINGS);
  assert.equal(saved.confirmSplitViewDelete, false);
  assert.deepEqual(saved.personalization, current.personalization);
});
test("a stale renderer snapshot preserves cloud preferences outside its actual edit", () => {
  const baseline = structuredClone(DEFAULT_APP_SETTINGS);
  const current = { ...baseline, fileEditorThemeId: "high-contrast" as const };
  const next = withMainOwnedSettings(current, { ...baseline, agentCompletionNotificationsEnabled: false }, baseline);
  assert.equal(next.fileEditorThemeId, "high-contrast"); assert.equal(next.agentCompletionNotificationsEnabled, false);
});
