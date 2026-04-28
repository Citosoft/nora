import type { AppState } from "@shared/appTypes";
import { OrchestratorLifecycleService } from "@main/orchestrator/orchestratorLifecycleService";
import { WorkspaceStateCoordinator } from "@main/orchestrator/workspaceStateCoordinator";
import { WorkspaceStateService } from "@main/orchestrator/workspaceStateService";
import assert from "node:assert/strict";
import test from "node:test";

function createState(): AppState {
  return {
    focusedAgentId: null,
    focusedTerminalId: null
  } as unknown as AppState;
}

test("OrchestratorLifecycleService delegates initialize and queued refresh", async () => {
  const workspaceStateService = new WorkspaceStateService(new WorkspaceStateCoordinator());
  const events: string[] = [];

  const service = new OrchestratorLifecycleService({
    initialize: {
      detectTerminalShells: async () => [],
      readActiveRemoteMounts: async () => [],
      loadRecentProjects: async () => [],
      loadToolConfigs: async () => ({}),
      setToolConfigs: () => {
        events.push("set-tool-configs");
      },
      updateState: () => {
        events.push("update-state");
      },
      refreshCatalog: async () => createState(),
      restoreWorkspaceState: async () => {
        events.push("restore");
      },
      refreshWorkspaceSummaries: async () => {
        events.push("refresh");
      },
      getSnapshot: () => createState()
    },
    runRefreshWorkspaceSummaries: async () => {
      events.push("queued-refresh");
    },
    workspaceStateService
  });

  await service.initialize();
  await service.refreshWorkspaceSummaries("test");

  assert.equal(events.includes("set-tool-configs"), true);
  assert.equal(events.includes("update-state"), true);
  assert.equal(events.includes("restore"), true);
  assert.equal(events.includes("refresh"), true);
  assert.equal(events.includes("queued-refresh"), true);
});
