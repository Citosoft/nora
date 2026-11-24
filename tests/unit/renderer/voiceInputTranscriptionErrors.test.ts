import {
  isEmptyVoiceInputTranscriptionError,
  logEmptyVoiceInputTranscription,
  voiceInputFailureMessage
} from "@/components/app/logic/voiceInputTranscriptionErrors";
import assert from "node:assert/strict";
import test from "node:test";

test("isEmptyVoiceInputTranscriptionError matches silent or missing audio failures", () => {
  assert.equal(isEmptyVoiceInputTranscriptionError("No audio was captured."), true);
  assert.equal(
    isEmptyVoiceInputTranscriptionError(
      "Error invoking remote method 'app:transcribe-voice-input': Error: Local transcription returned no transcript. The recording may be silent or too short."
    ),
    true
  );
  assert.equal(isEmptyVoiceInputTranscriptionError("Voice transcription returned no text."), true);
  assert.equal(isEmptyVoiceInputTranscriptionError("Voice transcription failed (500): server error"), false);
});

test("logEmptyVoiceInputTranscription writes an info log", () => {
  const originalInfo = console.info;
  const messages: unknown[][] = [];
  console.info = (...args: unknown[]) => {
    messages.push(args);
  };

  try {
    logEmptyVoiceInputTranscription("No audio was captured.");
    assert.deepEqual(messages, [["[nora] Voice input skipped:", "No audio was captured."]]);
  } finally {
    console.info = originalInfo;
  }
});

test("voiceInputFailureMessage strips the IPC prefix and skips empty recordings", () => {
  const originalInfo = console.info;
  console.info = () => {};
  try {
    assert.equal(
      voiceInputFailureMessage(new Error("Error invoking remote method 'app:transcribe-voice-input': Error: Voice transcription failed (401): bad key")),
      "Voice input failed: Voice transcription failed (401): bad key"
    );
    assert.equal(voiceInputFailureMessage(new Error("No audio was captured.")), null);
  } finally {
    console.info = originalInfo;
  }
});
