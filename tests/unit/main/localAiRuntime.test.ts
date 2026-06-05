import { buildManagedLlamaExecutablePath, buildManagedLlamaRuntimeDirectory } from "@main/ai/localAiRuntime";
import assert from "node:assert/strict";
import test from "node:test";

test("managed llama runtime paths stay under userData ai-runtime", () => {
  const userDataPath = process.platform === "win32" ? "C:\\Users\\nora\\AppData\\Roaming\\Nora" : "/Users/nora/Library/Application Support/Nora";
  const runtimeDirectory = buildManagedLlamaRuntimeDirectory(userDataPath);
  const executablePath = buildManagedLlamaExecutablePath(userDataPath);

  assert.match(runtimeDirectory, /ai-runtime[\\/]+llama$/);
  assert.equal(executablePath, `${runtimeDirectory}${process.platform === "win32" ? "\\" : "/"}llama-cli${process.platform === "win32" ? ".exe" : ""}`);
});
