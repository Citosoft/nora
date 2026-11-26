import assert from "node:assert/strict";
import test from "node:test";
import { installedProviderAgentIds, providerSetupSteps } from "@/components/app/logic/providerSetupSteps";

test("installed provider agents are detected catalog entries Nora can run", () => {
  assert.deepEqual(installedProviderAgentIds([
    { id: "claude", detected: true }, { id: "codex", detected: false }, { id: "not-a-provider", detected: true }
  ]), ["claude"]);
});

test("without an installed agent, installing is the current step", () => {
  assert.deepEqual(providerSetupSteps({ installedAgentIds: [], checking: false }).map((step) => step.state), ["current", "pending", "pending"]);
  assert.deepEqual(providerSetupSteps({ installedAgentIds: [], checking: true }).map((step) => step.state), ["checking", "pending", "pending"]);
});

test("steps run install, connect, sign in", () => {
  assert.deepEqual(providerSetupSteps({ installedAgentIds: [], checking: false }).map((step) => step.id), ["install", "connect", "sign-in"]);
});

test("an installed agent ticks installation and makes connecting it the current step", () => {
  assert.deepEqual(providerSetupSteps({ installedAgentIds: ["claude"], checking: false }).map((step) => step.state), ["done", "current", "pending"]);
  assert.deepEqual(providerSetupSteps({ installedAgentIds: ["claude"], checking: true }).map((step) => step.state), ["done", "checking", "pending"]);
});
