import type { ThreadListRow, ThreadSourceFilter, ThreadSort } from "./list.types";
import type { ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { ReactNode } from "react";
import type { ConversationRun, ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadDocument, ThreadWorkspaceStore, ThreadWorkspaceSnapshot } from "./state.types";
import type { ThreadGrouping } from "./navigation.types";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";

export type ThreadNavigationFilter = "all" | "active" | "attention" | "settled";
export type ThreadNavigationStatus = "Queued" | "Starting" | "Working" | "Needs approval" | "Needs input" | "Stopping"
  | "Completed" | "Failed" | "Interrupted" | "Outcome unconfirmed" | "Delivery unconfirmed" | "Draft" | "Queue paused" | "Ready" | "Settled";
export interface ThreadRowProps {
  row: ThreadListRow;
  now?: number;
  workspace: WorkspaceAvatarIdentity | null;
  request: ForgeBranchPullRequestStatus | null;
  onOpen(row: ThreadListRow): void;
  onTogglePin(row: ThreadListRow): void;
  onSetSettled?(row: ThreadListRow, settled: boolean): void;
}
export interface ThreadStatusIconProps { row: Pick<ThreadNavigationRow, "status" | "working" | "unread">; }
export interface ThreadNavigationRow {
  target: { kind: "draft"; documentId: string } | { kind: "thread"; conversationId: string };
  id: string;
  title: string;
  workspaceId: string;
  providerKind: ProviderBinding["kind"] | null;
  origin?: "cli" | "desktop";
  status: ThreadNavigationStatus;
  active: boolean;
  working: boolean;
  unread: boolean;
  attention: boolean;
  pinned: boolean;
  selected: boolean;
  hasDraft: boolean;
  queuedCount: number;
  settled?: boolean;
  updatedAt: string;
}
export interface ThreadNavigationPorts {
  client: ThreadWorkspaceStore["client"];
  resumeExternal: ThreadWorkspaceStore["resumeExternal"];
  pinExternal: ThreadWorkspaceStore["pinExternal"];
  setSettled: ThreadWorkspaceStore["setSettled"];
  state: ThreadWorkspaceSnapshot;
  focusWorkspace(workspaceId: string): void;
  openDraft(workspaceId: string): void;
  openRow(row: ThreadNavigationRow): void;
  togglePin(conversationId: string): void;
  refresh(): void;
  setThreadVisible(visible: boolean): void;
}
export interface ThreadCenterPorts { state: ThreadWorkspaceSnapshot; store: ThreadWorkspaceStore; userDisplayName: string; }
export interface ThreadTabsPorts {
  documents: readonly ThreadDocument[];
  titles: Readonly<Record<string, string>>;
  activeId: string | null;
  focus(id: string): void;
  close(id: string): void;
}
export interface ThreadWorkspaceCompositionProps { store: ThreadWorkspaceStore; children: ReactNode; }
export interface ThreadViewContentProps { documentId: string; }
export interface ThreadWorkspacePickerProps {
  workspace: NativeWorkspace;
  workspaces: readonly NativeWorkspace[];
  disabled: boolean;
  onSelect(workspaceId: string): void;
}
export type ThreadRunState = ConversationRun["state"];

export interface ThreadNavigationProps {
  workspaceId?: string | null;
  onNew?(): void;
  query?: string;
  unified?: boolean;
  onNavigate?(): void;
  sort?: ThreadSort;
  onSortChange?(sort: ThreadSort): void;
  sourceFilter?: ThreadSourceFilter;
  onSourceFilterChange?(source: ThreadSourceFilter): void;
  grouping?: ThreadGrouping;
  onGroupingChange?(grouping: ThreadGrouping): void;
}
