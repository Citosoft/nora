import { appendVoiceTranscript } from "@/components/app/logic/voiceInputDraft";
import assert from "node:assert/strict";
import test from "node:test";

test("appendVoiceTranscript fills an empty draft with the trimmed transcript", () => {
  assert.equal(appendVoiceTranscript("", "  hello there "), "hello there");
});

test("appendVoiceTranscript joins existing text with one space", () => {
  assert.equal(appendVoiceTranscript("Fix the build  ", "and run tests"), "Fix the build and run tests");
});

test("appendVoiceTranscript keeps the draft when nothing was said", () => {
  assert.equal(appendVoiceTranscript("Keep me", "   "), "Keep me");
});
