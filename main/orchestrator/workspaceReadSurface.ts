import { createWorkspaceActions } from "./workspaceActions";
import { WorkspaceActionsApiBase } from "./workspaceActionsApiBase";

/**
 * Workspace file/list/task read API (same as the former {@link WorkspaceActionsApiBase} mixin on
 * {@link Orchestrator}) so the orchestrator class is not a god surface for both IPC wiring and
 * workspace read helpers.
 */
export class OrchestratorWorkspaceReadSurface extends WorkspaceActionsApiBase {
  constructor(private readonly getActions: () => ReturnType<typeof createWorkspaceActions>) {
    super();
  }

  protected getWorkspaceActions(): ReturnType<typeof createWorkspaceActions> {
    return this.getActions();
  }

  /** Same handle as {@link WorkspaceActionsApiBase} methods use — passed to {@link WorkspaceMainService}. */
  getWorkspaceActionsForMainService(): ReturnType<typeof createWorkspaceActions> {
    return this.getWorkspaceActions();
  }
}
