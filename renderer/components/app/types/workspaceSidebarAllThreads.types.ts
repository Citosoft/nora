import type { ExternalHarnessSessionSummary } from "@shared/appTypes";

export type AllThreadsGroupBy = "none" | "workspace" | "harness";

export type AllWorkspaceThreadListEntry = {
  workspaceId: string;
  workspaceName: string;
  workspaceRootPath: string;
  thread: ExternalHarnessSessionSummary;
};

export type AllThreadsGroupSection = {
  groupKey: string;
  groupLabel: string;
  groupSortRank: number;
  entries: AllWorkspaceThreadListEntry[];
};

/** A group section trimmed to its most recent threads unless the user expanded it. */
export type AllThreadsVisibleGroupSection = AllThreadsGroupSection & {
  visibleEntries: AllWorkspaceThreadListEntry[];
  /** Threads beyond the collapsed limit; zero means the section needs no expand toggle. */
  overflowEntryCount: number;
  isExpanded: boolean;
};
