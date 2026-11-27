import assert from "node:assert/strict";
import test from "node:test";
import { settingsChangeEvents } from "@main/helpers/analytics/settingsChanges";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";

test("settings changes report option names, and values only when they are code-defined options", () => {
  const next = {
    ...DEFAULT_APP_SETTINGS,
    confirmSplitViewDelete: false,
    notchIsland: { ...DEFAULT_APP_SETTINGS.notchIsland, enabled: !DEFAULT_APP_SETTINGS.notchIsland.enabled },
    ai: { ...DEFAULT_APP_SETTINGS.ai, apiKeys: { ...DEFAULT_APP_SETTINGS.ai.apiKeys, openai: "sk-secret" } },
    terminalPresets: [{ id: "x", name: "Client Acme", workingDirectory: "/Users/jane/acme", commands: ["make"] }]
  };
  assert.deepEqual(settingsChangeEvents(DEFAULT_APP_SETTINGS, next).map((event) => event.properties), [
    { setting: "confirmSplitViewDelete", value: false },
    { setting: "notchIsland.enabled", value: !DEFAULT_APP_SETTINGS.notchIsland.enabled },
    { setting: "terminalPresets", value: null },
    { setting: "ai.apiKeys", value: null }
  ]);
});

test("unchanged settings report nothing", () => {
  assert.deepEqual(settingsChangeEvents(DEFAULT_APP_SETTINGS, { ...DEFAULT_APP_SETTINGS }), []);
});
