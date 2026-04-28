import type { WorkspaceLoadingState } from "@/components/app/types";

export type WorkspaceSessionLoadingAppClosingState = {
  detail: string;
  command: string | null;
};

export type WorkspaceSessionLoadingOverlayProps = {
  workspaceLoading: WorkspaceLoadingState | null;
  isAddingWorkspace: boolean;
  appClosingState: WorkspaceSessionLoadingAppClosingState | null;
  onDismissWorkspaceLoading: () => void;
};
