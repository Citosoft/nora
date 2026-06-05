import {
  createIdleVoiceInputLevels,
  sampleVoiceInputLevels,
  VOICE_INPUT_LEVEL_BAR_COUNT
} from "@/components/app/logic/voiceInputLevels";
import assert from "node:assert/strict";
import test from "node:test";

test("createIdleVoiceInputLevels returns a stable low baseline for every bar", () => {
  const levels = createIdleVoiceInputLevels(6);
  assert.equal(levels.length, 6);
  assert.ok(levels.every((level) => level === 0.12));
});

test("sampleVoiceInputLevels maps frequency bins into normalized bar levels", () => {
  const analyser = {
    frequencyBinCount: 8,
    getByteFrequencyData: (target: Uint8Array) => {
      target.set([0, 32, 64, 128, 255, 128, 64, 32]);
    }
  } as AnalyserNode;

  const levels = sampleVoiceInputLevels(analyser, 4);
  assert.equal(levels.length, 4);
  assert.ok(levels.every((level) => level >= 0.08 && level <= 1));
  assert.ok(levels[3] > levels[0]);
});

test("sampleVoiceInputLevels defaults to the shared bar count", () => {
  const analyser = {
    frequencyBinCount: VOICE_INPUT_LEVEL_BAR_COUNT * 2,
    getByteFrequencyData: (target: Uint8Array) => {
      target.fill(128);
    }
  } as AnalyserNode;

  assert.equal(sampleVoiceInputLevels(analyser).length, VOICE_INPUT_LEVEL_BAR_COUNT);
});
