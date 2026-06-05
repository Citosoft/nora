import { buildAgentLaunchCommand, normalizeAgentLaunchCommand } from "@main/orchestrator/agentLaunch";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeAgentLaunchCommand appends codex no-alt-screen flag", () => {
  const command = normalizeAgentLaunchCommand("codex", "codex");
  assert.equal(command, "codex --no-alt-screen");
});

test("normalizeAgentLaunchCommand keeps existing codex no-alt-screen flag", () => {
  const command = normalizeAgentLaunchCommand("codex", "codex --no-alt-screen");
  assert.equal(command, "codex --no-alt-screen");
});

test("normalizeAgentLaunchCommand sanitizes malformed Windows cursor quoting", () => {
  const command = normalizeAgentLaunchCommand(
    "cursor",
    "'\\\"C:\\\\Users\\\\Daniel\\\\AppData\\\\Local\\\\cursor-agent\\\\cursor-agent.cmd\\\"'",
    { isWindowsPlatform: true }
  );
  assert.equal(command, "\"C:\\Users\\Daniel\\AppData\\Local\\cursor-agent\\cursor-agent.cmd\"");
});

test("normalizeAgentLaunchCommand leaves non-Windows cursor commands unchanged", () => {
  const command = normalizeAgentLaunchCommand(
    "cursor",
    "'\\\"/usr/local/bin/cursor-agent\\\"'",
    { isWindowsPlatform: false }
  );
  assert.equal(command, "'\\\"/usr/local/bin/cursor-agent\\\"'");
});

test("normalizeAgentLaunchCommand strips quoted gemini resume ids", () => {
  assert.equal(
    normalizeAgentLaunchCommand("gemini", "gemini --resume '3b4f3b67-5171-4d0c-b5d1-195abe5430a2'"),
    "gemini --resume 3b4f3b67-5171-4d0c-b5d1-195abe5430a2"
  );
  assert.equal(
    normalizeAgentLaunchCommand("gemini", "gemini --resume=\"3b4f3b67-5171-4d0c-b5d1-195abe5430a2\""),
    "gemini --resume=3b4f3b67-5171-4d0c-b5d1-195abe5430a2"
  );
});

test("normalizeAgentLaunchCommand strips invalid trailing characters from gemini resume ids", () => {
  assert.equal(
    normalizeAgentLaunchCommand("gemini", "gemini --resume 'a0dd1cab-b60b-415c-8a0e-1acb73721d0d|'"),
    "gemini --resume a0dd1cab-b60b-415c-8a0e-1acb73721d0d"
  );
  assert.equal(
    normalizeAgentLaunchCommand("gemini", "gemini --resume=a0dd1cab-b60b-415c-8a0e-1acb73721d0d|"),
    "gemini --resume=a0dd1cab-b60b-415c-8a0e-1acb73721d0d"
  );
});

test("buildAgentLaunchCommand presets codex interactive prompt", () => {
  const command = buildAgentLaunchCommand("codex", "codex", {
    initialPrompt: "Scaffold a Next.js app",
    initialPromptDelivery: "launch-command",
    isWindowsPlatform: false
  });

  assert.equal(command, "codex --no-alt-screen 'Scaffold a Next.js app'");
});

test("buildAgentLaunchCommand presets gemini prompt and workspace trust", () => {
  const command = buildAgentLaunchCommand("gemini", "gemini", {
    initialPrompt: "Scaffold a Ruby on Rails app",
    initialPromptDelivery: "launch-command",
    startupTrustMode: "trusted-workspace",
    isWindowsPlatform: false
  });

  assert.equal(command, "gemini --skip-trust --prompt-interactive 'Scaffold a Ruby on Rails app'");
});

test("buildAgentLaunchCommand presets claude interactive prompt", () => {
  const command = buildAgentLaunchCommand("claude", "claude", {
    initialPrompt: "Scaffold an Expo app",
    initialPromptDelivery: "launch-command",
    isWindowsPlatform: false
  });

  assert.equal(command, "claude 'Scaffold an Expo app'");
});

test("buildAgentLaunchCommand leaves unsupported launch prompt tools unchanged", () => {
  const command = buildAgentLaunchCommand("aider", "aider", {
    initialPrompt: "Scaffold a Django app",
    initialPromptDelivery: "launch-command",
    isWindowsPlatform: false
  });

  assert.equal(command, "aider");
});
