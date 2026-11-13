import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { AppState } from "@shared/appTypes";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadListRow } from "./list.types";

export type ThreadGrouping = "none" | "workspace" | "activity" | "source" | "provider";
/** Whether group members' own threads (where each bot does its work) are listed beside the group chat. */
export type MemberThreadVisibility = "visible" | "hidden";
/** `compact` fits section headings such as the Bots sidebar's Groups heading. */
export interface MemberThreadsToggleProps { compact?: boolean; }
export interface MemberThreadVisibilityControl { visibility: MemberThreadVisibility; setVisibility(visibility: MemberThreadVisibility): void; }
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
