import { LOCAL_VOICE_MODEL_SOURCES } from "@main/ai/local-voice/models";
import { LOCAL_VOICE_MODELS } from "@shared/voice/localModels";
import assert from "node:assert/strict";
import test from "node:test";

test("every catalog model has a download source run by the same engine", () => {
  for (const model of LOCAL_VOICE_MODELS) {
    assert.equal(LOCAL_VOICE_MODEL_SOURCES[model.id].engine, model.engine, model.id);
  }
});

test("archive models list their engine's files as required", () => {
  for (const source of Object.values(LOCAL_VOICE_MODEL_SOURCES)) {
    if (source.engine !== "sherpaOnnx") continue;
    assert.deepEqual([...source.download.requiredFiles].sort(), Object.values(source.files).sort());
    assert.match(source.download.url, /^https:\/\/github\.com\/k2-fsa\/sherpa-onnx\/releases\/download\/asr-models\/.+\.tar\.bz2$/);
  }
});
