import { buildSkillsCommandEnv } from "@main/agentSkills";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("buildSkillsCommandEnv injects npm cache and expands darwin executable PATH", () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "nora-agent-skills-home-"));
  const nvmBin = path.join(tempHome, ".nvm", "versions", "node", "v22.1.0", "bin");
  fs.mkdirSync(nvmBin, { recursive: true });

  const env = buildSkillsCommandEnv(
    {
      PATH: "",
      HOME: tempHome
    },
    "/tmp/nora-skills-cache-test",
    {
      platform: "darwin"
    }
  );

  assert.equal(env.npm_config_cache, "/tmp/nora-skills-cache-test");
  assert.equal(env.NPM_CONFIG_CACHE, "/tmp/nora-skills-cache-test");
  assert.equal((env.PATH || "").includes(nvmBin), true);
});

test("buildSkillsCommandEnv mirrors PATH into Path on win32", () => {
  const env = buildSkillsCommandEnv(
    {
      PATH: "C:\\Windows\\System32",
      HOME: os.homedir()
    },
    "C:\\temp\\nora-skills-cache-test",
    {
      platform: "win32"
    }
  );

  assert.equal(env.Path, env.PATH);
});
