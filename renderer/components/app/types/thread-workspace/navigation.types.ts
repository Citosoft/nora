import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { AppState } from "@shared/appTypes";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadListRow } from "./list.types";

export type ThreadGrouping = "none" | "workspace" | "activity" | "source" | "provider";
/** Whether group members' own threads (where each bot does its work) are listed beside the group chat. */
export type WorkThreadVisibility = "visible" | "hidden";
/** `compact` fits section headings such as the Bots sidebar's Groups heading. */
export interface WorkThreadsToggleProps { compact?: boolean; }
export interface WorkThreadVisibilityControl { visibility: WorkThreadVisibility; setVisibility(visibility: WorkThreadVisibility): void; }
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

export type ThreadShellNavigation =
  | { kind: "unchanged" }
  | { kind: "reveal"; projectId: string | null };

export interface ThreadGroupHeaderProps { group: ThreadNavigationGroup; }
