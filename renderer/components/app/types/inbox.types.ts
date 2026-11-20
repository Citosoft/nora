import type { ReactNode } from "react";
import type { InboxBridge } from "@shared/ipc/types/inboxGateway.types";
import type { InboxCommand, InboxItem, InboxSnapshot, InboxTarget } from "@shared/types/inbox/inbox.types";
import type { RequestResponse } from "@shared/types/conversation/contracts.types";

export interface InboxState { snapshot: InboxSnapshot; loading: boolean; error: string | null; }
/** Where thread views learn which threads have unread updates, and report the ones the user is looking at. */
export interface ThreadUnreadSource {
  unreadThreadIds(): readonly string[];
  markThreadRead(conversationId: string): void;
  subscribe(listener: () => void): () => void;
}
export interface InboxStore extends ThreadUnreadSource {
  state(): InboxState;
  /** Follows main's inbox while at least one caller is started; returns a stop function. */
  start(): () => void;
  /** Applies a mark; rejects with a user-meaningful message, which is also kept in state until the next success. */
  execute(command: InboxCommand): Promise<void>;
}
export interface InboxStoreDeps { client: Pick<InboxBridge, "list" | "execute" | "onChanged">; }

/** Inbox views in the sidebar, each a filter of the same items. */
export type InboxView = "all" | "needs-you" | "updates" | "snoozed";
export interface InboxViewCount { view: InboxView; label: string; count: number; }
export interface InboxSection { id: "needs-you" | "updates" | "snoozed"; title: string; items: readonly InboxItem[]; }
export interface InboxListFilter { view: InboxView; workspaceId: string | null; query: string; }
export interface InboxSnoozeChoice { label: string; until: string; }

export interface InboxActions {
  open(item: InboxItem): void;
  respond(item: Extract<InboxItem, { kind: "request" }>, response: RequestResponse): Promise<void>;
  execute(command: InboxCommand): Promise<void>;
}
export interface InboxOpenValue { open(target: InboxTarget): void; }
export interface InboxOpenProviderProps { children: ReactNode; }
export interface InboxRowProps { item: InboxItem; now: string; actions: InboxActions; }
/** Every item but a request, which keeps the shared waiting-request row. */
export type InboxEntryItem = Exclude<InboxItem, { kind: "request" }>;
export interface InboxEntryRowProps { item: InboxEntryItem; now: string; actions: InboxActions; }
export interface InboxEntryMarkProps { item: InboxEntryItem; }
export interface InboxRequestRowProps { item: Extract<InboxItem, { kind: "request" }>; now: string; actions: InboxActions; }
export interface InboxSectionListProps { sections: readonly InboxSection[]; now: string; actions: InboxActions; emptyMessage: string; }
export interface InboxItemMenuProps { item: InboxItem; now: string; actions: InboxActions; }
export interface InboxSnoozeItemsProps { item: InboxItem; choices: readonly InboxSnoozeChoice[]; onSnooze(until: string): void; onUnsnooze(): void; }
/** How one non-request item reads in the list: an icon or avatar, a headline, a detail line and the main action. */
export interface InboxEntryPresentation { title: string; detail: string | null; tone: "default" | "warning" | "danger"; actionLabel: string; }
export interface InboxSidebarProps { collapsed: boolean; }
export interface InboxScope { workspaceName: string; workspaceOnly: boolean; setWorkspaceOnly(workspaceOnly: boolean): void; }
export interface InboxPageModel {
  view: InboxView;
  setView(view: InboxView): void;
  counts: readonly InboxViewCount[];
  sections: readonly InboxSection[];
  now: string;
  actions: InboxActions;
  query: string;
  setQuery(query: string): void;
  /** Null when no workspace is focused, so the inbox can only show everything. */
  scope: InboxScope | null;
  loading: boolean;
  error: string | null;
  /** Null when nothing in view is unread. */
  markAllRead: (() => void) | null;
}
