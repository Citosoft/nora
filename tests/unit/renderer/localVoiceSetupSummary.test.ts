import { summarizeLocalVoiceSetup } from "@/components/app/logic/localVoiceSetupSummary";
import type { LocalVoiceInstallState, LocalVoiceSetupStatus } from "@shared/appTypes";
import { localVoiceModel } from "@shared/voice/localModels";
import assert from "node:assert/strict";
import test from "node:test";

const model = localVoiceModel("whisper-base.en");
const setup = (modelState: LocalVoiceInstallState, runtimeState: LocalVoiceInstallState, sizeBytes: number | null = null): LocalVoiceSetupStatus => ({
  model: { modelId: model.id, state: modelState, sizeBytes },
  runtime: { engine: "whisperCpp", state: runtimeState, executablePath: null }
});

test("summarizes each install state of a local model", () => {
  assert.deepEqual(summarizeLocalVoiceSetup(model, setup("installed", "installed", 147_951_465), false),
    { ready: true, status: "Installed (141 MB) · runs on whisper.cpp", installLabel: "Reinstall" });
  assert.equal(summarizeLocalVoiceSetup(model, setup("not-installed", "not-installed"), false).status, "Not downloaded · about 142 MB, plus whisper.cpp");
  assert.equal(summarizeLocalVoiceSetup(model, setup("not-installed", "installed"), false).status, "Not downloaded · about 142 MB");
  assert.equal(summarizeLocalVoiceSetup(model, setup("installed", "not-installed"), false).status, "Downloaded, but whisper.cpp isn't installed yet");
  assert.equal(summarizeLocalVoiceSetup(model, null, true).installLabel, "Installing…");
});

test("a Parakeet model names sherpa-onnx as the runtime it still needs", () => {
  const parakeet = localVoiceModel("parakeet-tdt-0.6b-v2");
  const status: LocalVoiceSetupStatus = {
    model: { modelId: parakeet.id, state: "not-installed", sizeBytes: null },
    runtime: { engine: "sherpaOnnx", state: "not-installed", executablePath: null }
  };
  assert.equal(summarizeLocalVoiceSetup(parakeet, status, false).status, "Not downloaded · about 460 MB, plus sherpa-onnx");
});
