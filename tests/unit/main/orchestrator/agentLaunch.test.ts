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

test("buildAgentLaunchCommand presets codex interactive prompt", () => {
  const command = buildAgentLaunchCommand("codex", "codex", {
    initialPrompt: "Scaffold a Next.js app",
    initialPromptDelivery: "launch-command",
    isWindowsPlatform: false
  });

  assert.equal(command, "codex --no-alt-screen 'Scaffold a Next.js app'");
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
  const command = buildAgentLaunchCommand("goose", "goose", {
    initialPrompt: "Scaffold a Django app",
    initialPromptDelivery: "launch-command",
    isWindowsPlatform: false
  });

  assert.equal(command, "goose");
});
