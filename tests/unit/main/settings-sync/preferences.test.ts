import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { captureSettings, applySettings } from "@main/settings-sync/preferences";
import { syncAppearance } from "../../helpers/settingsSync";

test("only portable preferences are captured; secrets, paths and provider instance IDs are excluded", () => {
  const settings = structuredClone(DEFAULT_APP_SETTINGS);
  settings.ai.apiKeys.openai = "private-key";
  settings.personalization.threadModel = { kind: "codex", instanceId: "device-specific-instance", model: "model-1" };
  settings.personalization.workspaceRoles = { "private-workspace-path": { id: "writing" } };
  const result = captureSettings(settings, syncAppearance);
  const serialized = JSON.stringify(result);
  for (const secret of ["private-key", "private-workspace-path", "device-specific-instance", "apiKeys", "hardwareAccelerationEnabled", "terminalPresets"]) assert.equal(serialized.includes(secret), false, secret);
  assert.deepEqual(result.threadModel, { kind: "codex", model: "model-1" });
});
test("receiving devices resolve models using their own provider instance and preserve local data", () => {
  const settings = structuredClone(DEFAULT_APP_SETTINGS); settings.ai.apiKeys.openai = "private";
  const expected = captureSettings(settings, syncAppearance);
  const next = applySettings(settings, syncAppearance, { threadModel: { kind: "codex", model: "new-model" }, automaticTitles: false }, expected,
    [{ kind: "codex", instanceId: "this-device", label: "Codex", reportsMcp: true }]);
  assert.deepEqual(next.personalization.threadModel, { kind: "codex", instanceId: "this-device", model: "new-model" });
  assert.equal(next.personalization.threads?.automaticTitles, false); assert.equal(next.ai.apiKeys.openai, "private");
});
test("cloud changes do not overwrite a newer edit made after the request began", () => {
  const settings = structuredClone(DEFAULT_APP_SETTINGS); const expected = captureSettings(settings, syncAppearance);
  settings.defaultSplitViewGridColumns = 4;
  const next = applySettings(settings, syncAppearance, { defaultSplitViewGridColumns: 1, fileEditorThemeId: "high-contrast" }, expected, []);
  assert.equal(next.defaultSplitViewGridColumns, 4); assert.equal(next.fileEditorThemeId, "high-contrast");
});
