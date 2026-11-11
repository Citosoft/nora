import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadNavigationRow } from "../thread-workspace/ports.types";
import type { WorkspaceToolId } from "../workspaceNavigation.types";

export interface HomeActivity {
  recent: ThreadNavigationRow[];
  total: number;
  active: number;
  attention: number;
  unread: number;
}

export interface WorkspaceHomeProps {
  workspace: NativeWorkspace | null;
  activity: HomeActivity;
  loading: boolean;
  error: string | null;
  onNewThread(): void;
  onOpenThread(row: ThreadNavigationRow): void;
  onRetry(): void;
  onOpenTool: ((tool: WorkspaceToolId) => void) | null;
}
