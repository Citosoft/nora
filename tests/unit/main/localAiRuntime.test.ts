import {
  buildLocalLlamaRuntimeEnv,
  buildManagedLlamaExecutablePath,
  buildManagedLlamaRuntimeDirectory,
  repairLocalLlamaRuntimeSharedLibraryLinks
} from "@main/ai/localAiRuntime";
import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("managed llama runtime paths stay under userData ai-runtime", () => {
  const userDataPath = process.platform === "win32" ? "C:\\Users\\nora\\AppData\\Roaming\\Nora" : "/Users/nora/Library/Application Support/Nora";
  const runtimeDirectory = buildManagedLlamaRuntimeDirectory(userDataPath);
  const executablePath = buildManagedLlamaExecutablePath(userDataPath);

  assert.match(runtimeDirectory, /ai-runtime[\\/]+llama$/);
  assert.equal(executablePath, `${runtimeDirectory}${process.platform === "win32" ? "\\" : "/"}llama-cli${process.platform === "win32" ? ".exe" : ""}`);
});

test("local llama runtime env includes executable directory for shared libraries", () => {
  const executablePath = process.platform === "win32"
    ? "C:\\Users\\nora\\AppData\\Roaming\\Nora\\ai-runtime\\llama\\llama-cli.exe"
    : "/home/nora/.config/Nora/ai-runtime/llama/llama-cli";
  const runtimeDirectory = process.platform === "win32"
    ? "C:\\Users\\nora\\AppData\\Roaming\\Nora\\ai-runtime\\llama"
    : "/home/nora/.config/Nora/ai-runtime/llama";
  const env = buildLocalLlamaRuntimeEnv(executablePath, {
    PATH: "/usr/bin",
    LD_LIBRARY_PATH: "/opt/lib",
    DYLD_LIBRARY_PATH: "/opt/dylib"
  });

  if (process.platform === "win32") {
    assert.equal(env.PATH?.split(";")[0], runtimeDirectory);
  } else if (process.platform === "darwin") {
    assert.equal(env.DYLD_LIBRARY_PATH?.split(":")[0], runtimeDirectory);
  } else {
    assert.equal(env.LD_LIBRARY_PATH?.split(":")[0], runtimeDirectory);
  }
});

test(
  "repairLocalLlamaRuntimeSharedLibraryLinks creates missing Linux SONAME links",
  { skip: process.platform !== "linux" },
  async () => {
    const runtimeDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-llama-runtime-test-"));
    try {
      await fsPromises.writeFile(path.join(runtimeDirectory, "libllama-common.so.0.0.9351"), "library");
      await fsPromises.writeFile(path.join(runtimeDirectory, "libllama-cli-impl.so"), "library");

      await repairLocalLlamaRuntimeSharedLibraryLinks(runtimeDirectory);

      const linkStats = await fsPromises.lstat(path.join(runtimeDirectory, "libllama-common.so.0"));
      assert.equal(linkStats.isSymbolicLink() || linkStats.isFile(), true);

      await assert.rejects(fsPromises.lstat(path.join(runtimeDirectory, "libllama-cli-impl.so.0")));
    } finally {
      await fsPromises.rm(runtimeDirectory, { recursive: true, force: true });
    }
  }
);
