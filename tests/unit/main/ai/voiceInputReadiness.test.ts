import { getVoiceInputReadiness } from "@main/ai/voiceInputReadiness";
import type { VoiceInputReadinessDeps } from "@main/types/voiceInputReadiness.types";
import { DEFAULT_APP_SETTINGS, type AppSettings, type LocalVoiceInstallState } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function settings(provider: AppSettings["voice"]["dictationProvider"], openaiKey = ""): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ai: { ...DEFAULT_APP_SETTINGS.ai, apiKeys: { ...DEFAULT_APP_SETTINGS.ai.apiKeys, openai: openaiKey } },
    voice: { ...DEFAULT_APP_SETTINGS.voice, dictationProvider: provider }
  };
}

function deps(model: LocalVoiceInstallState, runtime: LocalVoiceInstallState): VoiceInputReadinessDeps {
  return {
    getLocalSetupStatus: async (modelId) => ({
      model: { modelId, state: model, sizeBytes: null },
      runtime: { engine: "whisperCpp", state: runtime, executablePath: null }
    })
  };
}

test("OpenAI dictation is ready only with an API key", async () => {
  assert.equal((await getVoiceInputReadiness(settings("openai", "  "), deps("installed", "installed"))).state, "unconfigured");
  assert.deepEqual(await getVoiceInputReadiness(settings("openai", "sk-test"), deps("not-installed", "not-installed")), { state: "ready" });
});

test("a local model needs both its engine runtime and its weights", async () => {
  const noRuntime = await getVoiceInputReadiness(settings("local"), deps("installed", "not-installed"));
  assert.equal(noRuntime.state === "unconfigured" && noRuntime.reason.includes("whisper.cpp"), true);
  const noModel = await getVoiceInputReadiness(settings("local"), deps("not-installed", "installed"));
  assert.equal(noModel.state === "unconfigured" && noModel.reason.includes("Whisper Base (English)"), true);
  assert.deepEqual(await getVoiceInputReadiness(settings("local"), deps("installed", "installed")), { state: "ready" });
});
