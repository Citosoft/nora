import { parseSherpaOnnxOutput, sherpaOnnxRuntimeAsset } from "@main/ai/local-voice/sherpaOnnx";
import assert from "node:assert/strict";
import test from "node:test";

test("parseSherpaOnnxOutput reads the text from the result JSON among the logs", () => {
  const output = [
    "OfflineRecognizerConfig(feat_config=FeatureExtractorConfig(sampling_rate=16000))",
    "Started",
    "Done!",
    "",
    "/tmp/voice-input.wav",
    "{\"lang\": \"\", \"emotion\": \"\", \"event\": \"\", \"text\": \" Run the unit tests, please.\", \"timestamps\": [0.12, 0.4], \"tokens\": [\" Run\"], \"words\": []}",
    "----",
    "Elapsed seconds: 0.412 s"
  ].join("\n");
  assert.equal(parseSherpaOnnxOutput(output), "Run the unit tests, please.");
});

test("parseSherpaOnnxOutput returns nothing for silent or failed runs", () => {
  assert.equal(parseSherpaOnnxOutput("{\"text\": \"\"}"), "");
  assert.equal(parseSherpaOnnxOutput("Error: failed to load model\n{not json \"text\""), "");
});

test("sherpaOnnxRuntimeAsset picks the CPU build for each supported platform", () => {
  assert.equal(sherpaOnnxRuntimeAsset("darwin", "arm64"), "sherpa-onnx-v1.13.8-osx-arm64-shared-no-tts.tar.bz2");
  assert.equal(sherpaOnnxRuntimeAsset("darwin", "x64"), "sherpa-onnx-v1.13.8-osx-x64-shared-no-tts.tar.bz2");
  assert.equal(sherpaOnnxRuntimeAsset("linux", "arm64"), "sherpa-onnx-v1.13.8-linux-aarch64-shared-cpu.tar.bz2");
  assert.equal(sherpaOnnxRuntimeAsset("win32", "x64"), "sherpa-onnx-v1.13.8-win-x64-shared-MT-Release-no-tts.tar.bz2");
  assert.equal(sherpaOnnxRuntimeAsset("win32", "ia32"), null);
  assert.equal(sherpaOnnxRuntimeAsset("freebsd", "x64"), null);
});
