import {
  createCachedAgentTerminalActionsDependencies,
  createCachedSessionActionsDependencies,
  createCachedWorkspaceActions
} from "@main/orchestrator/orchestratorActionBuilders";
import assert from "node:assert/strict";
import test from "node:test";

test("cached action/dependency builders return existing cached values", () => {
  const existingSessionDeps = { cached: "session" } as any;
  const existingWorkspaceActions = { cached: "workspace" } as any;
  const existingAgentDeps = { cached: "agent" } as any;

  const sessionResult = createCachedSessionActionsDependencies(
    existingSessionDeps,
    {} as any
  );
  const workspaceResult = createCachedWorkspaceActions(
    existingWorkspaceActions,
    {} as any
  );
  const agentResult = createCachedAgentTerminalActionsDependencies(
    existingAgentDeps,
    {} as any
  );

  assert.equal(sessionResult, existingSessionDeps);
  assert.equal(workspaceResult, existingWorkspaceActions);
  assert.equal(agentResult, existingAgentDeps);
});
