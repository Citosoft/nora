import { buildManagedWhisperExecutablePath, buildManagedWhisperRuntimeDirectory, normalizeWhisperOutput } from "@main/ai/local-voice/whisperCpp";
import assert from "node:assert/strict";
import test from "node:test";

test("managed whisper runtime paths stay under userData voice-runtime", () => {
  const userDataPath = process.platform === "win32" ? "C:\\Users\\nora\\AppData\\Roaming\\Nora" : "/Users/nora/Library/Application Support/Nora";
  const runtimeDirectory = buildManagedWhisperRuntimeDirectory(userDataPath);
  const executablePath = buildManagedWhisperExecutablePath(userDataPath);

  assert.match(runtimeDirectory, /voice-runtime[\\/]+whisper$/);
  assert.equal(executablePath, `${runtimeDirectory}${process.platform === "win32" ? "\\" : "/"}whisper-cli${process.platform === "win32" ? ".exe" : ""}`);
});

test("whisper.cpp output drops timestamps and joins segments", () => {
  assert.equal(normalizeWhisperOutput("[00:00:00.000 --> 00:00:02.000]  Hello there.\n\n[00:00:02.000 --> 00:00:03.000] Run the tests.\n"), "Hello there. Run the tests.");
  assert.equal(normalizeWhisperOutput("\n  \n"), "");
});
