import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";
import type { ThreadSubagentSummary } from "./threadSubagents.types";
import type { ThreadSkillsState } from "./threadSkills.types";

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
  providerLabel: string;
  connectors: ThreadConnectorsState | null;
  skills: ThreadSkillsState | null;
  changes: ThreadChangeSummary;
  subagents: ThreadSubagentSummary;
  request: ThreadRequestState;
  expanded: boolean;
  busy: boolean;
  canSettle: boolean;
  hasOlderHistory: boolean;
  onToggle(): void;
  onRefresh(): void;
  onLoadHistory(): void;
  onSettleChange(): void;
}

export interface ThreadIdePickerProps {
  workspace: WorkspaceRef;
}
