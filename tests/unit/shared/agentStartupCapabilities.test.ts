import {
  canPresetAgentWorkspaceTrust,
  resolveManagedAgentLaunchOptions
} from "@shared/agentStartupCapabilities";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveManagedAgentLaunchOptions presets launch prompt and trust for supported agents", () => {
  assert.deepEqual(resolveManagedAgentLaunchOptions("gemini"), {
    initialPromptDelivery: "launch-command",
    startupTrustMode: "trusted-workspace"
  });
  assert.deepEqual(resolveManagedAgentLaunchOptions("cursor"), {
    initialPromptDelivery: "terminal",
    startupTrustMode: "default"
  });
  assert.deepEqual(resolveManagedAgentLaunchOptions("aider"), {
    initialPromptDelivery: "terminal",
    startupTrustMode: "default"
  });
});

test("canPresetAgentWorkspaceTrust is limited to agents with interactive trust flags", () => {
  assert.equal(canPresetAgentWorkspaceTrust("gemini"), true);
  assert.equal(canPresetAgentWorkspaceTrust("cursor"), false);
  assert.equal(canPresetAgentWorkspaceTrust("claude"), false);
});
