import { buildExecutableSearchPath } from "@main/pathEnv";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("buildExecutableSearchPath keeps override PATH entries first", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-path-order-"));
  const secondDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-path-order-"));
  const result = buildExecutableSearchPath(
    {
      PATH: "/usr/bin:/bin",
      HOME: os.homedir()
    },
    {
      overridePath: `${tempDir}${path.delimiter}${secondDir}`,
      platform: "darwin"
    }
  );

  assert.equal(result.startsWith(`${tempDir}:${secondDir}`), true);
});

test("buildExecutableSearchPath adds recent nvm node bins on darwin", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "nora-path-home-"));
  const nvmRoot = path.join(tempHome, ".nvm", "versions", "node");
  const olderBin = path.join(nvmRoot, "v20.10.0", "bin");
  const newerBin = path.join(nvmRoot, "v20.11.1", "bin");
  fs.mkdirSync(olderBin, { recursive: true });
  fs.mkdirSync(newerBin, { recursive: true });

  const result = buildExecutableSearchPath(
    {
      PATH: "/usr/bin:/bin",
      HOME: tempHome
    },
    {
      platform: "darwin"
    }
  );

  assert.equal(result.includes(newerBin), true);
  assert.equal(result.includes(olderBin), true);
});
