import { hasBusyTerminalActivity } from "@main/orchestrator/agentBusyActivity";
import assert from "node:assert/strict";
import test from "node:test";

test("hasBusyTerminalActivity ignores plain input echoes", () => {
  assert.equal(hasBusyTerminalActivity("h"), false);
  assert.equal(hasBusyTerminalActivity("hello"), false);
});

test("hasBusyTerminalActivity ignores generic shell output without busy signals", () => {
  assert.equal(hasBusyTerminalActivity("README.md\nsrc\npackage.json\n"), false);
});

test("hasBusyTerminalActivity detects busy keywords from agent progress lines", () => {
  assert.equal(hasBusyTerminalActivity("Thinking through a plan...\n"), true);
  assert.equal(hasBusyTerminalActivity("Applying patch to renderer/App.tsx\n"), true);
  assert.equal(hasBusyTerminalActivity("Running tests for changed files\n"), true);
});

test("hasBusyTerminalActivity ignores prompts and command echoes", () => {
  assert.equal(hasBusyTerminalActivity("$ ls\n"), false);
  assert.equal(hasBusyTerminalActivity("PS D:\\dev\\myproject> "), false);
  assert.equal(hasBusyTerminalActivity("> ls\n"), false);
});

test("hasBusyTerminalActivity detects codex progress lines prefixed with chevrons", () => {
  assert.equal(hasBusyTerminalActivity("> working\n"), true);
  assert.equal(hasBusyTerminalActivity("› Working on changes…\n"), true);
  assert.equal(hasBusyTerminalActivity("• Working (9s • esc to interrupt)\n"), true);
});
