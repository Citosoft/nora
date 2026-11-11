import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { AppState } from "@shared/appTypes";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadListRow } from "./list.types";

export type ThreadGrouping = "none" | "workspace" | "activity" | "source" | "provider";
export interface ThreadNavigationGroup {
  id: string;
  label: string | null;
  workspace: WorkspaceAvatarIdentity | null;
  providerKind?: ProviderBinding["kind"] | null;
  rows: readonly ThreadListRow[];
}

export interface NativeShellNavigationInput {
  projectId: string | null;
  focusWorkspace(projectId: string): Promise<AppState | null>;
  showThread(): void;
  onError(cause: unknown): void;
}

export interface ThreadGroupHeaderProps { group: ThreadNavigationGroup; }
