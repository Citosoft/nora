export class WorkspaceStateCoordinator {
  private readonly suppressedWorkspaceRoots = new Set<string>();
  private readonly suppressedWorkspaceIds = new Set<string>();
  private persistWorkspaceStateChain: Promise<void> = Promise.resolve();
  private refreshWorkspaceSummariesPromise: Promise<void> | null = null;
  private refreshWorkspaceSummariesQueued = false;

  suppressWorkspace(projectRoot: string, projectId?: string | null): void {
    this.suppressedWorkspaceRoots.add(projectRoot);
    if (projectId) {
      this.suppressedWorkspaceIds.add(projectId);
    }
  }

  unsuppressWorkspace(projectRoot: string, projectId?: string | null): void {
    this.suppressedWorkspaceRoots.delete(projectRoot);
    if (projectId) {
      this.suppressedWorkspaceIds.delete(projectId);
    }
  }

  isWorkspaceSuppressed(project: { id: string; rootPath: string }): boolean {
    return this.suppressedWorkspaceIds.has(project.id) || this.suppressedWorkspaceRoots.has(project.rootPath);
  }

  isSuppressedWorkspaceRoot(rootPath: string): boolean {
    return this.suppressedWorkspaceRoots.has(rootPath);
  }

  getRefreshQueueState(): { promise: Promise<void> | null; queued: boolean } {
    return {
      promise: this.refreshWorkspaceSummariesPromise,
      queued: this.refreshWorkspaceSummariesQueued
    };
  }

  setRefreshQueueState(state: { promise: Promise<void> | null; queued: boolean }): void {
    this.refreshWorkspaceSummariesPromise = state.promise;
    this.refreshWorkspaceSummariesQueued = state.queued;
  }

  schedulePersistWorkspaceState(runPersist: () => Promise<void>): void {
    this.persistWorkspaceStateChain = this.persistWorkspaceStateChain
      .catch(() => {
        // keep the chain alive after a failed write
      })
      .then(() => runPersist());
  }
}
