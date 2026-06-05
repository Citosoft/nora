import { buildManagedWhisperExecutablePath, buildManagedWhisperRuntimeDirectory } from "@main/ai/localVoiceRuntime";
import assert from "node:assert/strict";
import test from "node:test";

test("managed whisper runtime paths stay under userData voice-runtime", () => {
  const userDataPath = process.platform === "win32" ? "C:\\Users\\nora\\AppData\\Roaming\\Nora" : "/Users/nora/Library/Application Support/Nora";
  const runtimeDirectory = buildManagedWhisperRuntimeDirectory(userDataPath);
  const executablePath = buildManagedWhisperExecutablePath(userDataPath);

  assert.match(runtimeDirectory, /voice-runtime[\\/]+whisper$/);
  assert.equal(executablePath, `${runtimeDirectory}${process.platform === "win32" ? "\\" : "/"}whisper-cli${process.platform === "win32" ? ".exe" : ""}`);
});
