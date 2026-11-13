import { settingsPortsFixture } from "./settingsFixture";
import { agentSettingsPatchSchema } from "@shared/nora-tools/settings";
import assert from "node:assert/strict";
import test from "node:test";
import { noraFixture } from "./fixture";
import { createSettingsUpdates } from "@main/helpers/settingsUpdates";
import { createSettingsOperations } from "@main/nora-tools/operations/settings";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { noraToolsStatus } from "@shared/nora-tools/catalog";

test("settings tools return all preferences and apply partial nested updates", async () => {
  const f = noraFixture();
  const before = structuredClone(f.settings);
  const read = await f.deps.settings.read();
  assert.equal("ai" in read.general, true);
  assert.equal("personalization" in read, true);
  assert.equal(read.threads.automaticTitles, true);
  const saved = await f.deps.settings.update({ general: { agentCompletionNotificationsEnabled: false }, threads: { automaticTitles: false, settleAfterDays: 7 } });
  assert.equal(saved.general.agentCompletionNotificationsEnabled, false);
  assert.equal(saved.threads.automaticTitles, false);
  assert.equal(saved.threads.settleAfterDays, 7);
  assert.deepEqual(f.settings.ai, before.ai);
  assert.deepEqual(f.settings.personalization.defaultRole, before.personalization.defaultRole);
  assert.equal(f.settings.confirmSplitViewDelete, before.confirmSplitViewDelete);
  assert.equal(f.settingsNotifications, 1);
});

test("settings tools reject unknown fields, empty patches, invalid values and missing providers without saving", async () => {
  const f = noraFixture();
  for (const patch of [{}, { general: {} }, { general: { confirmSplitViewDelete: "false" } }, { general: { unsupported: true } },
    { threads: { settleAfterDays: 0 } }, { threads: { claudeAutoCompactTokens: 1 } }]) {
    // Tool arguments enter through an untyped protocol; exercise validation at that boundary too.
    await assert.rejects(async () => f.deps.settings.update(agentSettingsPatchSchema.parse(patch)));
  }
  await assert.rejects(f.deps.settings.update({ threads: { threadModel: { kind: "codex", instanceId: "missing", model: "gpt-6" } } }), /No installed provider/);
  assert.equal(f.settingsNotifications, 0);
});

test("model defaults can be selected and reset without disturbing other thread preferences", async () => {
  const f = noraFixture();
  const model = { kind: "codex" as const, instanceId: "codex", model: "gpt-6" };
  await f.deps.settings.update({ threads: { threadModel: model, subagentModel: model, followUp: "steer" } });
  assert.deepEqual((await f.deps.settings.read()).threads.threadModel, model);
  await f.deps.settings.update({ threads: { threadModel: null, subagentModel: null } });
  assert.equal(f.settings.personalization.threadModel, undefined);
  assert.equal((await f.deps.settings.read()).threads.subagentModel, null);
  assert.equal((await f.deps.settings.read()).threads.followUp, "steer");
});

test("settings operations merge against the latest serialized settings and notify only after persistence succeeds", async () => {
  let settings = structuredClone(DEFAULT_APP_SETTINGS);
  let fail = true;
  let notifications = 0;
  const updates = createSettingsUpdates({ read: () => settings, onSaved() {}, async save(next) {
    if (fail) throw new Error("disk full");
    settings = next; return settings;
  } });
  const operations = createSettingsOperations({ ...settingsPortsFixture(), readSettings: () => settings, updateSettings: updates.update,
    onSettingsChanged() { notifications += 1; }, boot: () => ({ environmentId: "local", cursor: 0, personalization: settings.personalization,
      providers: [], workspaces: [], sharedBots: [], noraTools: noraToolsStatus("idle") }) });
  await assert.rejects(operations.update({ general: { confirmSplitViewDelete: false } }), /disk full/);
  assert.equal(notifications, 0);
  fail = false;
  await Promise.all([operations.update({ general: { confirmSplitViewDelete: false } }), operations.update({ threads: { automaticTitles: false } })]);
  assert.equal(settings.confirmSplitViewDelete, false);
  assert.equal(settings.personalization.threads?.automaticTitles, false);
  assert.equal(notifications, 2);
});


test("settings tools change theme, appearance, local preferences and sync through their owning stores", async () => {
  const f = noraFixture();
  const result = await f.deps.settings.update({ appearance: { themeMode: "dark", accentColor: "violet", uiFontId: "inter" },
    local: { defaultIdeId: "vscode", githubToken: "test-token" }, syncEnabled: true });
  assert.equal(result.appearance.themeMode, "dark");
  assert.equal(result.appearance.accentColor, "violet");
  assert.equal(result.appearance.uiFontId, "inter");
  assert.equal(result.appearance.terminalThemeId, "app");
  assert.equal(result.local.defaultIdeId, "vscode");
  assert.equal(result.local.githubToken, "test-token");
  assert.equal(result.syncEnabled, true);
  assert.equal(f.settingsNotifications, 0);
  assert.deepEqual(await f.deps.settings.read(), result);
});

test("all persisted settings are exposed and nested AI, voice, terminal and personalization edits preserve siblings", async () => {
  const f = noraFixture();
  const read = await f.deps.settings.read();
  assert.deepEqual(Object.keys(read.general).sort(), Object.keys(DEFAULT_APP_SETTINGS).filter((key) => key !== "personalization").sort());
  const before = structuredClone(f.settings);
  const updated = await f.deps.settings.update({ general: {
    ai: { apiKeys: { openai: "test-key" }, modelByProvider: { openai: "test-model" }, simpleTaskProvider: "codex" },
    voice: { localWhisperModelId: "tiny.en" }, terminalQuickLaunchDefaults: { name: "Dev" }, analyticsConsentStatus: "declined",
    terminalPresets: [{ id: "dev", name: "Dev", workingDirectory: "/workspace", commands: ["npm run dev"] }]
  }, personalization: { defaultRole: { id: "developer" }, workspaceRoles: { w: { id: "designer" } } } });
  assert.equal(updated.general.ai.apiKeys.openai, "test-key");
  assert.equal(updated.general.ai.apiKeys.google, before.ai.apiKeys.google);
  assert.equal(updated.general.ai.modelByProvider.openai, "test-model");
  assert.equal(updated.general.voice.dictationProvider, before.voice.dictationProvider);
  assert.equal(updated.general.terminalQuickLaunchDefaults.target, before.terminalQuickLaunchDefaults.target);
  assert.equal(updated.personalization.defaultRole?.id, "developer");
  assert.equal(updated.personalization.workspaceRoles.w.id, "designer");
  assert.equal(updated.general.terminalPresets.length, 1);
});
