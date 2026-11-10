import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

export type BranchRequestReader = (projectId: string, branch: string) => Promise<ForgeBranchPullRequestStatus | null>;
export type ThreadChangeSummary =
  | { status: "pending" | "unavailable" }
  | { status: "ready"; scope: "turn" | "workspace"; files: number; additions: number | null; deletions: number | null; reviews: number; partial: boolean; };
export type ThreadRequestState =
  | { status: "unavailable" | "loading" }
  | { status: "ready"; request: ForgeBranchPullRequestStatus | null }
  | { status: "failed"; message: string };
export interface ThreadInsightsInput {
  header: ConversationHeader | undefined;
  items: readonly TimelineItem[];
  workspace: NativeWorkspace;
  hasOlderHistory: boolean;
  readBranchRequest: BranchRequestReader | null;
}
export interface ThreadInsightsPanelProps {
  header: ConversationHeader;
  changes: ThreadChangeSummary;
  request: ThreadRequestState;
  expanded: boolean;
  busy: boolean;
  canArchive: boolean;
  hasOlderHistory: boolean;
  onToggle(): void;
  onRefresh(): void;
  onLoadHistory(): void;
  onArchive(): void;
}
