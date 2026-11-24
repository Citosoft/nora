import { DEFAULT_VOICE_SETTINGS, parseVoiceSettings } from "@shared/voice/settings";
import { LOCAL_VOICE_MODELS, isLocalVoiceModelId } from "@shared/voice/localModels";
import assert from "node:assert/strict";
import test from "node:test";

test("legacy Whisper-only voice settings migrate to the local model provider", () => {
  assert.deepEqual(parseVoiceSettings({ dictationProvider: "localWhisper", localWhisperModelId: "tiny.en" }),
    { dictationProvider: "local", localModelId: "whisper-tiny.en" });
  assert.deepEqual(parseVoiceSettings({ dictationProvider: "openai", localWhisperModelId: "base.en" }),
    { dictationProvider: "openai", localModelId: "whisper-base.en" });
});

test("current voice settings pass through and unknown values fall back to defaults", () => {
  assert.deepEqual(parseVoiceSettings({ dictationProvider: "local", localModelId: "whisper-tiny.en" }),
    { dictationProvider: "local", localModelId: "whisper-tiny.en" });
  assert.deepEqual(parseVoiceSettings({ dictationProvider: "elsewhere", localModelId: "parakeet-v9" }), DEFAULT_VOICE_SETTINGS);
  assert.deepEqual(parseVoiceSettings(null), DEFAULT_VOICE_SETTINGS);
});

test("every listed local model id is recognised", () => {
  assert.equal(LOCAL_VOICE_MODELS.every((model) => isLocalVoiceModelId(model.id)), true);
  assert.equal(isLocalVoiceModelId("toString"), false);
});
