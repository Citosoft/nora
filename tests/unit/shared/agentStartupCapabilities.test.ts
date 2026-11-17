import { resolveManagedAgentLaunchOptions } from "@shared/agentStartupCapabilities";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveManagedAgentLaunchOptions presets the launch prompt only for agents that accept one", () => {
  assert.deepEqual(resolveManagedAgentLaunchOptions("claude"), { initialPromptDelivery: "launch-command" });
  assert.deepEqual(resolveManagedAgentLaunchOptions("codex"), { initialPromptDelivery: "launch-command" });
  assert.deepEqual(resolveManagedAgentLaunchOptions("cursor"), { initialPromptDelivery: "terminal" });
});
