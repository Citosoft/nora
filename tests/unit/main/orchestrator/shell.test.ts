import { getPtyEnv, getShell } from "@main/orchestrator/shell";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const originalShell = process.env.SHELL;
const isWindows = process.platform === "win32";

test.afterEach(() => {
  if (originalShell === undefined) {
    delete process.env.SHELL;
    return;
  }

  process.env.SHELL = originalShell;
});

test("getShell uses an absolute SHELL executable when available", () => {
  if (isWindows) {
    return;
  }

  process.env.SHELL = "/bin/sh";

  assert.equal(getShell(), "/bin/sh");
});

test("getShell extracts executable when SHELL includes flags", () => {
  if (isWindows) {
    return;
  }

  process.env.SHELL = "/bin/sh -l";

  assert.equal(getShell(), "/bin/sh");
});

test("getShell resolves bare shell names to known absolute paths", () => {
  if (isWindows) {
    return;
  }

  process.env.SHELL = "sh";

  assert.equal(getShell(), "/bin/sh");
});

test("getShell falls back to an existing system shell when SHELL is invalid", () => {
  if (isWindows) {
    return;
  }

  process.env.SHELL = "/definitely/missing-shell";

  const resolved = getShell();
  assert.equal(fs.existsSync(resolved), true);
  assert.equal(resolved.startsWith("/"), true);
});

test("getPtyEnv keeps tool-provided PATH entries first", () => {
  const delimiter = isWindows ? ";" : ":";
  const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-seed-path-"));
  const overrideDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-override-path-"));

  const env = getPtyEnv(
    {
      PATH: `${seedDir}${delimiter}${isWindows ? "C:\\Windows\\System32" : "/usr/bin"}`,
      LANG: "en_GB.UTF-8"
    },
    {
      PATH: `${overrideDir}${delimiter}${seedDir}`
    },
    120,
    36
  );

  const pathValue = env.PATH || "";
  assert.equal(pathValue.split(delimiter)[0], overrideDir);
});
