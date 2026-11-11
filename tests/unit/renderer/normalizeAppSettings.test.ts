import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { canGenerateSimpleText, parseAiSimpleTaskProvider } from "@shared/ai/settings";
import { normalizeAppSettings } from "@/components/app/logic/normalizeAppSettings";

for (const provider of ["codex", "claude", "local", "cloud"] as const) {
  test(`${provider} selection survives renderer normalization and repeated settings saves`, () => {
    const selected = { ...DEFAULT_APP_SETTINGS, ai: { ...DEFAULT_APP_SETTINGS.ai, simpleTaskProvider: provider } };
    const normalized = normalizeAppSettings(selected);
    assert.equal(normalized.ai.simpleTaskProvider, provider);
    assert.equal(normalizeAppSettings(normalized).ai.simpleTaskProvider, provider);
    assert.equal(parseAiSimpleTaskProvider(provider), provider);
    assert.equal(canGenerateSimpleText(normalized.ai), provider !== "cloud");
  });
}

test("cloud generation needs a nonblank key, while invalid stored sources use the existing default", () => {
  assert.equal(canGenerateSimpleText({ ...DEFAULT_APP_SETTINGS.ai, apiKeys: { openai: " ", anthropic: "", google: "" } }), false);
  assert.equal(canGenerateSimpleText({ ...DEFAULT_APP_SETTINGS.ai, apiKeys: { openai: "", anthropic: "test-key", google: "" } }), true);
  for (const value of [undefined, null, "invalid", {}, 1]) assert.equal(parseAiSimpleTaskProvider(value), "cloud");
});
