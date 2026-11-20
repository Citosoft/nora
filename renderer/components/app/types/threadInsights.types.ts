import type { ReactNode } from "react";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";
import type { ThreadSubagentSummary } from "./threadSubagents.types";
import type { ThreadSkillsState } from "./threadSkills.types";
import type { ThreadBranchInsights, ThreadForgeClient } from "./threadForge.types";
import type { ThreadOutput, ThreadOutputTarget } from "./threadOutputs.types";

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
  outputs: readonly ThreadOutput[];
  branch: ThreadBranchInsights;
  expanded: boolean;
  busy: boolean;
  canSettle: boolean;
  hasOlderHistory: boolean;
  onToggle(): void;
  onLoadHistory(): void;
  onOpenOutput(output: ThreadOutputTarget): Promise<void>;
  onSettleChange(): void;
}

export interface ThreadBranchSectionProps {
  branch: ThreadBranchInsights;
}

export interface ThreadIdePickerProps {
  workspace: WorkspaceRef;
}

/** Hideable blocks of the floating thread details panel; the header and settle footer always show. */
export type ThreadInsightsSectionId = "overview" | "ide" | "subagents" | "changes" | "outputs" | "branch" | "connectors" | "nora-connectors" | "skills";
export interface ThreadInsightsSectionDefinition {
  id: ThreadInsightsSectionId;
  label: string;
}
export interface ThreadInsightsSectionVisibility {
  hidden: ReadonlySet<ThreadInsightsSectionId>;
  isVisible(id: ThreadInsightsSectionId): boolean;
  toggle(id: ThreadInsightsSectionId): void;
  showAll(): void;
}
export interface ThreadInsightsSectionsMenuProps {
  visibility: ThreadInsightsSectionVisibility;
}
export interface ThreadInsightsSectionsContextMenuProps extends ThreadInsightsSectionsMenuProps {
  children: ReactNode;
}
