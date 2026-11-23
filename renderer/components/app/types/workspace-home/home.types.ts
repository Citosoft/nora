import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadNavigationRow } from "../thread-workspace/ports.types";
import type { WorkspaceToolId } from "../workspaceNavigation.types";
import type { ReactNode } from "react";
import type { AttentionToastsState } from "../attentionToasts.types";

export interface WorkspaceHomeCommandsProps { projectId: string; }

/** A workspace's threads split by the next thing the user would do with them. */
export interface HomeActivity {
  /** Waiting on an approval, an answer, or a look at a failed or unconfirmed run. */
  needsYou: ThreadNavigationRow[];
  /** Running or queued, nothing to do yet. */
  inProgress: ThreadNavigationRow[];
  /** Everything else that is not settled, newest first. */
  recent: ThreadNavigationRow[];
  total: number;
  /** Threads the home leaves to the sidebar: settled ones and those past a section's cap. */
  hidden: number;
  unread: number;
}

export interface WorkspaceHomeProps {
  /** Self-loading slots: the header's branch status, and the side column's commands and tasks. */
  branchStatus?: ReactNode;
  commands?: ReactNode;
  tasks?: ReactNode;
  /** Requests waiting in this workspace's threads, answerable on the home. */
  requests: AttentionToastsState;
  workspace: NativeWorkspace | null;
  activity: HomeActivity;
  providerLabels: ReadonlyMap<string, string>;
  loading: boolean;
  error: string | null;
  /** Opens a new draft, with the text ready to send when given. */
  onNewThread(text?: string): void;
  onOpenThread(row: ThreadNavigationRow): void;
  onRetry(): void;
  onOpenTool: ((tool: WorkspaceToolId) => void) | null;
}

export type WorkspaceHomeActivityProps = Pick<WorkspaceHomeProps, "workspace" | "activity" | "requests" | "providerLabels" | "loading" | "error" | "onOpenThread" | "onRetry">;

export interface WorkspaceHomeThreadSectionProps {
  id: string;
  title: string;
  rows: readonly ThreadNavigationRow[];
  providerLabels: ReadonlyMap<string, string>;
  now: number;
  tone?: "attention";
  /** Rows shown above the threads, such as answerable requests, and how many they are. */
  leading?: { node: ReactNode; count: number };
  onOpenThread(row: ThreadNavigationRow): void;
}

export interface WorkspaceHomeThreadRowProps {
  row: ThreadNavigationRow;
  providerLabel?: string;
  now: number;
  onOpen(row: ThreadNavigationRow): void;
}

export interface WorkspaceHomeComposerProps {
  disabled: boolean;
  onStart(text?: string): void;
}

export interface WorkspaceHomeToolsProps { onOpenTool(tool: WorkspaceToolId): void; }
