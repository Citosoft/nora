import { AGENT_DEFINITIONS, getDefaultToolCommand } from "@main/agentCatalog";
import assert from "node:assert/strict";
import test from "node:test";

const expectedAgentIds = [
  "codex",
  "claude",
  "gemini",
  "cursor",
  "aider",
  "goose",
  "qwen",
  "opencode",
  "grok",
  "copilot",
  "continue",
  "amp",
  "crush"
];

test("agent catalog includes common CLI coding agents", () => {
  assert.deepEqual(AGENT_DEFINITIONS.map((tool) => tool.id), expectedAgentIds);
});

test("agent definitions provide launch, detection, and install defaults", () => {
  for (const tool of AGENT_DEFINITIONS) {
    assert.equal(tool.label.trim().length > 0, true, `${tool.id} has a label`);
    assert.equal(tool.launchCommand.trim().length > 0, true, `${tool.id} has a launch command`);
    assert.equal(tool.aliases.length > 0, true, `${tool.id} has aliases`);
    assert.equal(tool.installTemplate.trim().length > 0, true, `${tool.id} has an install template`);
    assert.equal(tool.executablePathCandidates.length > 0, true, `${tool.id} has executable path candidates`);
  }
});

test("agent executable candidates cover Windows, macOS, and Linux", () => {
  const supportedPlatforms: NodeJS.Platform[] = ["win32", "darwin", "linux"];

  for (const tool of AGENT_DEFINITIONS) {
    for (const platform of supportedPlatforms) {
      assert.equal(
        tool.executablePathCandidates.some((candidate) => !candidate.platforms || candidate.platforms.includes(platform)),
        true,
        `${tool.id} has ${platform} executable candidates`
      );
    }
  }
});

test("opencode includes its default home install path candidate", () => {
  const opencode = AGENT_DEFINITIONS.find((tool) => tool.id === "opencode");

  assert.equal(
    opencode?.executablePathCandidates.some((candidate) => candidate.path === "~/.opencode/bin/opencode"),
    true
  );
});

test("npm-backed agent tools expose matching uninstall commands", () => {
  for (const tool of AGENT_DEFINITIONS.filter((entry) => entry.installTemplate.startsWith("npm install -g "))) {
    assert.match(getDefaultToolCommand(tool, "remove"), /^npm uninstall -g /);
  }
});

test("script-backed agent tools do not invent uninstall commands", () => {
  for (const tool of AGENT_DEFINITIONS.filter((entry) => !entry.installTemplate.startsWith("npm install -g "))) {
    assert.equal(getDefaultToolCommand(tool, "remove"), "");
  }
});
