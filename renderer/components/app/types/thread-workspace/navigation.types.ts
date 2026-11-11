import type { AppState } from "@shared/appTypes";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadNavigationRow } from "./ports.types";

export type ThreadGrouping = "none" | "workspace" | "activity";
export interface ThreadNavigationGroup {
  id: string;
  label: string | null;
  workspace: WorkspaceAvatarIdentity | null;
  rows: readonly ThreadNavigationRow[];
}

export interface NativeShellNavigationInput {
  projectId: string | null;
  focusWorkspace(projectId: string): Promise<AppState | null>;
  showThread(): void;
  onError(cause: unknown): void;
}
