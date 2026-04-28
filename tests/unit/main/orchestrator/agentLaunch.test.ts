import { normalizeAgentLaunchCommand } from "@main/orchestrator/agentLaunch";
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
