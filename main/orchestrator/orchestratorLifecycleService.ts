import type { AppState } from "@shared/appTypes";
import { initializeLifecycle, refreshWorkspaceSummariesQueued } from "./lifecycleActions";
import type { WorkspaceStateService } from "./workspaceStateService";

type OrchestratorLifecycleServiceDeps = {
  initialize: Parameters<typeof initializeLifecycle>[0];
  runRefreshWorkspaceSummaries: (reason: string) => Promise<void>;
  workspaceStateService: WorkspaceStateService;
};

export class OrchestratorLifecycleService {
  constructor(private readonly deps: OrchestratorLifecycleServiceDeps) {}

  async initialize(): Promise<AppState> {
    return initializeLifecycle(this.deps.initialize);
  }

  async refreshWorkspaceSummaries(reason = "unknown"): Promise<void> {
    return refreshWorkspaceSummariesQueued({
      runRefreshWorkspaceSummaries: (runReason) => this.deps.runRefreshWorkspaceSummaries(runReason),
      getRefreshQueueState: () => this.deps.workspaceStateService.getRefreshQueueState(),
      setRefreshQueueState: (state) => this.deps.workspaceStateService.setRefreshQueueState(state)
    }, reason);
  }
}
