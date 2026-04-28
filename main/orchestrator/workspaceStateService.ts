import type { AppState, ProjectSummary } from "@shared/appTypes";
import type { WorkspaceStateCoordinator } from "./workspaceStateCoordinator";

export class WorkspaceStateService {
  constructor(private readonly coordinator: WorkspaceStateCoordinator) {}

  suppressWorkspace(projectRoot: string, projectId?: string | null): void {
    this.coordinator.suppressWorkspace(projectRoot, projectId);
  }

  unsuppressWorkspace(projectRoot: string, projectId?: string | null): void {
    this.coordinator.unsuppressWorkspace(projectRoot, projectId);
  }

  isWorkspaceSuppressed(project: Pick<ProjectSummary, "id" | "rootPath">): boolean {
    return this.coordinator.isWorkspaceSuppressed(project);
  }

  isSuppressedWorkspaceRoot(rootPath: string): boolean {
    return this.coordinator.isSuppressedWorkspaceRoot(rootPath);
  }

  getRefreshQueueState(): { promise: Promise<void> | null; queued: boolean } {
    return this.coordinator.getRefreshQueueState();
  }

  setRefreshQueueState(state: { promise: Promise<void> | null; queued: boolean }): void {
    this.coordinator.setRefreshQueueState(state);
  }

  schedulePersistWorkspaceState(getSnapshot: () => AppState, persist: (state: AppState) => Promise<void>): void {
    this.coordinator.schedulePersistWorkspaceState(() => persist(getSnapshot()));
  }
}
