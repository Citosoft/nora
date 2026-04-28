import { buildProcessEnv } from "@main/processEnv";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("buildProcessEnv keeps override PATH entries first", () => {
  const delimiter = ";";
  const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-process-env-seed-"));
  const overrideDir = fs.mkdtempSync(path.join(os.tmpdir(), "nora-process-env-override-"));
  const env = buildProcessEnv(
    {
      PATH: `${seedDir}${delimiter}/usr/bin`,
      HOME: os.homedir()
    },
    {
      PATH: `${overrideDir}${delimiter}${seedDir}`
    },
    {
      platform: "win32"
    }
  );

  const firstEntry = (env.PATH || "").split(delimiter)[0];
  assert.equal(firstEntry, overrideDir);
});

test("buildProcessEnv mirrors PATH into Path on win32", () => {
  const env = buildProcessEnv(
    {
      PATH: "C:\\Windows\\System32",
      HOME: os.homedir()
    },
    {
      PATH: "C:\\Custom\\Bin"
    },
    {
      platform: "win32"
    }
  );

  assert.equal(env.Path, env.PATH);
});
