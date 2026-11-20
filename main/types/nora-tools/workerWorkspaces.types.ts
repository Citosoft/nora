import type { AppState, CreateWorktreePayload } from "@shared/appTypes";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

export interface NoraWorkerWorkspaces {
  isolate(workspace: WorkspaceRef, title: string): Promise<WorkspaceRef>;
}
export interface WorkerWorkspacesDeps {
  boot(): NativeBoot;
  createWorktree(payload: CreateWorktreePayload): Promise<AppState>;
  syncCheckouts(projectId: string): Promise<NativeBoot>;
  nextId(): string;
}
