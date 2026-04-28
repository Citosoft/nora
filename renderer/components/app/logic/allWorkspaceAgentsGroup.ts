import type { AllAgentsGroupBy, AllAgentsGroupSection, AllWorkspaceAgentListEntry } from "@/components/app/types/workspaceSidebarAllAgents.types";
import type { GithubBranchPullRequestState } from "@shared/appTypes";

const hasPullRequestState = (state: GithubBranchPullRequestState | null | undefined): boolean =>
  state === "open" || state === "draft" || state === "closed" || state === "merged";

const getPullRequestGroupSortRank = (state: GithubBranchPullRequestState | null | undefined): number => {
  if (state === "open") {
    return 0;
  }
  if (state === "draft") {
    return 1;
  }
  if (state === "merged") {
    return 2;
  }
  if (state === "closed") {
    return 3;
  }
  return 4;
};

const sortByRecentActivityDesc = (entries: AllWorkspaceAgentListEntry[]): AllWorkspaceAgentListEntry[] =>
  [...entries].sort((left, right) => {
    const rightTime = Number.isNaN(new Date(right.agent.lastEventAt).getTime())
      ? 0
      : new Date(right.agent.lastEventAt).getTime();
    const leftTime = Number.isNaN(new Date(left.agent.lastEventAt).getTime())
      ? 0
      : new Date(left.agent.lastEventAt).getTime();
    return rightTime - leftTime;
  });

export const buildAllAgentsGroupSections = (
  entries: AllWorkspaceAgentListEntry[],
  groupBy: AllAgentsGroupBy
): AllAgentsGroupSection[] => {
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });

  if (groupBy === "none") {
    return [
      {
        groupKey: "flat",
        groupLabel: "",
        groupSortRank: 0,
        entries: sortByRecentActivityDesc(entries)
      }
    ];
  }

  if (groupBy === "workspace") {
    const byWorkspace = new Map<string, { workspaceName: string; entries: AllWorkspaceAgentListEntry[] }>();
    for (const entry of entries) {
      const existing = byWorkspace.get(entry.workspaceId);
      if (existing) {
        existing.entries.push(entry);
      } else {
        byWorkspace.set(entry.workspaceId, { workspaceName: entry.workspaceName, entries: [entry] });
      }
    }
    return [...byWorkspace.entries()]
      .map(([workspaceId, { workspaceName, entries: groupEntries }]) => ({
        groupKey: `workspace:${workspaceId}`,
        groupLabel: workspaceName,
        groupSortRank: 0,
        entries: sortByRecentActivityDesc(groupEntries)
      }))
      .sort((left, right) => collator.compare(left.groupLabel, right.groupLabel));
  }

  const buckets = new Map<
    string,
    { groupLabel: string; groupSortRank: number; entries: AllWorkspaceAgentListEntry[] }
  >();

  const touchBucket = (groupKey: string, groupLabel: string, groupSortRank: number) => {
    if (!buckets.has(groupKey)) {
      buckets.set(groupKey, { groupLabel, groupSortRank, entries: [] });
    }
    return buckets.get(groupKey)!;
  };

  for (const entry of entries) {
    const state = entry.pullRequestStatus?.state;
    if (hasPullRequestState(state)) {
      const groupLabel =
        state === "open"
          ? "Open"
          : state === "draft"
            ? "Draft"
            : state === "merged"
              ? "Merged"
              : "Closed";
      touchBucket(`pr:${state}`, groupLabel, getPullRequestGroupSortRank(state)).entries.push(entry);
    } else {
      touchBucket("pr:none", "No pull request", 4).entries.push(entry);
    }
  }

  return [...buckets.entries()]
    .map(([groupKey, meta]) => ({
      groupKey,
      groupLabel: meta.groupLabel,
      groupSortRank: meta.groupSortRank,
      entries: sortByRecentActivityDesc(meta.entries)
    }))
    .sort((left, right) =>
      left.groupSortRank !== right.groupSortRank
        ? left.groupSortRank - right.groupSortRank
        : collator.compare(left.groupLabel, right.groupLabel)
    );
};
