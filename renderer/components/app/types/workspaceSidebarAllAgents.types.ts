import type { AgentSession, ForgeBranchPullRequestStatus } from "@shared/appTypes";

export type AllAgentsPrFilter = "all" | "with_pr" | "none" | "open" | "draft" | "merged" | "closed";

export type AllAgentsGroupBy = "none" | "pr_status" | "workspace";

export type AllWorkspaceAgentListEntry = {
  workspaceId: string;
  workspaceName: string;
  agent: AgentSession;
  pullRequestStatus: ForgeBranchPullRequestStatus | null;
};

export type AllAgentsGroupSection = {
  groupKey: string;
  groupLabel: string;
  groupSortRank: number;
  entries: AllWorkspaceAgentListEntry[];
};
