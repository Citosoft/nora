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
