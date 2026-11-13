import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";
import type { ThreadSubagentSummary } from "./threadSubagents.types";
import type { ThreadSkillsState } from "./threadSkills.types";
import type { ThreadBranchInsights, ThreadForgeClient } from "./threadForge.types";

export type ThreadChangeSummary =
  | { status: "pending" | "unavailable" }
  | { status: "ready"; scope: "turn" | "workspace"; files: number; additions: number | null; deletions: number | null; reviews: number; partial: boolean; };
export interface ThreadInsightsInput {
  header: ConversationHeader | undefined;
  items: readonly TimelineItem[];
  workspace: NativeWorkspace;
  hasOlderHistory: boolean;
  forge: ThreadForgeClient | null;
}
export interface ThreadInsightsPanelProps {
  header: ConversationHeader;
  providerLabel: string;
  connectors: ThreadConnectorsState | null;
  skills: ThreadSkillsState | null;
  changes: ThreadChangeSummary;
  subagents: ThreadSubagentSummary;
  branch: ThreadBranchInsights;
  expanded: boolean;
  busy: boolean;
  canSettle: boolean;
  hasOlderHistory: boolean;
  onToggle(): void;
  onLoadHistory(): void;
  onSettleChange(): void;
}

export interface ThreadBranchSectionProps {
  branch: ThreadBranchInsights;
}

export interface ThreadIdePickerProps {
  workspace: WorkspaceRef;
}
