import type { AgentToolConfig, AppState } from "@shared/appTypes";

type LifecycleActionDependencies = {
  detectTerminalShells: () => Promise<AppState["terminalShells"]>;
  readActiveRemoteMounts: () => Promise<AppState["activeRemoteMounts"]>;
  loadRecentProjects: () => Promise<AppState["recentProjects"]>;
  loadToolConfigs: () => Promise<Record<string, AgentToolConfig>>;
  setToolConfigs: (configs: Record<string, AgentToolConfig>) => void;
  updateState: (updater: (state: AppState) => AppState) => void;
  scheduleCatalogRefresh: () => void;
  restoreWorkspaceState: () => Promise<void>;
  refreshWorkspaceSummaries: (reason: string) => Promise<void>;
  getSnapshot: () => AppState;
};

type RefreshQueueState = {
  promise: Promise<void> | null;
  queued: boolean;
};

type RefreshQueueDependencies = {
  runRefreshWorkspaceSummaries: (reason: string) => Promise<void>;
  getRefreshQueueState: () => RefreshQueueState;
  setRefreshQueueState: (state: RefreshQueueState) => void;
};

export async function initializeLifecycle(deps: LifecycleActionDependencies): Promise<AppState> {
  const recentProjects = await deps.loadRecentProjects();
  const toolConfigs = await deps.loadToolConfigs();
  deps.setToolConfigs(toolConfigs);
  const terminalShells = await deps.detectTerminalShells();
  const activeRemoteMounts = await deps.readActiveRemoteMounts();

  deps.updateState((state) => ({
    ...state,
    recentProjects,
    terminalShells,
    activeRemoteMounts
  }));

  deps.scheduleCatalogRefresh();
  await deps.restoreWorkspaceState();
  await deps.refreshWorkspaceSummaries("initialize");
  return deps.getSnapshot();
}

export async function refreshWorkspaceSummariesQueued(
  deps: RefreshQueueDependencies,
  reason = "unknown"
): Promise<void> {
  const current = deps.getRefreshQueueState();
  if (current.promise) {
    deps.setRefreshQueueState({
      ...current,
      queued: true
    });
    return current.promise;
  }

  const promise = (async () => {
    do {
      deps.setRefreshQueueState({
        promise: null,
        queued: false
      });
      await deps.runRefreshWorkspaceSummaries(reason);
    } while (deps.getRefreshQueueState().queued);
  })().finally(() => {
    deps.setRefreshQueueState({
      promise: null,
      queued: false
    });
  });

  deps.setRefreshQueueState({
    promise,
    queued: false
  });
  return promise;
}

