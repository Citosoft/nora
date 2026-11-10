import type { ReactNode } from "react";
import type { ConversationRun, ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadDocument, ThreadWorkspaceStore, ThreadWorkspaceSnapshot } from "./state.types";

export type ThreadNavigationFilter = "all" | "active" | "attention" | "archive";
export interface ThreadNavigationRow {
  target: { kind: "draft"; documentId: string } | { kind: "thread"; conversationId: string };
  id: string;
  title: string;
  workspaceId: string;
  providerKind: ProviderBinding["kind"] | null;
  status: string;
  active: boolean;
  attention: boolean;
  pinned: boolean;
  selected: boolean;
  hasDraft: boolean;
  queuedCount: number;
  updatedAt: string;
}
export interface ThreadNavigationPorts {
  state: ThreadWorkspaceSnapshot;
  focusWorkspace(workspaceId: string): void;
  openDraft(workspaceId: string): void;
  openRow(row: ThreadNavigationRow): void;
  togglePin(conversationId: string): void;
  refresh(): void;
}
export interface ThreadCenterPorts { state: ThreadWorkspaceSnapshot; store: ThreadWorkspaceStore; }
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

export interface ThreadNavigationProps { workspaceId?: string | null; onNew?(): void; }
