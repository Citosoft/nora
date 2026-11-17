import type { AppState, CreateWorktreePayload } from "@shared/appTypes";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";

export interface CreateThreadWorktreeDeps {
  createWorktree(payload: CreateWorktreePayload): Promise<AppState>;
  /** Re-registers the project's worktrees as checkouts and returns the refreshed boot state. */
  syncCheckouts(projectId: string): Promise<NativeBoot>;
}
