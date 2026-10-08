import type {
  AllThreadsGroupBy,
  AllThreadsGroupSection,
  AllThreadsVisibleGroupSection,
  AllWorkspaceThreadListEntry
} from "@/components/app/types/workspaceSidebarAllThreads.types";

const toTime = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortByRecentActivityDesc = (entries: AllWorkspaceThreadListEntry[]): AllWorkspaceThreadListEntry[] =>
  [...entries].sort((left, right) => toTime(right.thread.lastUpdatedAt) - toTime(left.thread.lastUpdatedAt));

export const buildAllThreadsGroupSections = (
  entries: AllWorkspaceThreadListEntry[],
  groupBy: AllThreadsGroupBy
): AllThreadsGroupSection[] => {
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

  const buckets = new Map<
    string,
    { groupLabel: string; groupSortRank: number; entries: AllWorkspaceThreadListEntry[] }
  >();

  for (const entry of entries) {
    const groupKey = groupBy === "workspace"
      ? `workspace:${entry.workspaceId}`
      : `harness:${entry.thread.toolId}`;
    const groupLabel = groupBy === "workspace" ? entry.workspaceName : entry.thread.toolLabel;
    const existing = buckets.get(groupKey);
    if (existing) {
      existing.entries.push(entry);
    } else {
      buckets.set(groupKey, { groupLabel, groupSortRank: 0, entries: [entry] });
    }
  }

  return [...buckets.entries()]
    .map(([groupKey, meta]) => ({
      groupKey,
      groupLabel: meta.groupLabel,
      groupSortRank: meta.groupSortRank,
      entries: sortByRecentActivityDesc(meta.entries)
    }))
    .sort((left, right) => collator.compare(left.groupLabel, right.groupLabel));
};

export const limitAllThreadsGroupSections = (
  sections: AllThreadsGroupSection[],
  expandedGroupKeys: ReadonlySet<string>,
  visibleLimit: number
): AllThreadsVisibleGroupSection[] =>
  sections.map((section) => {
    const isExpanded = expandedGroupKeys.has(section.groupKey);
    return {
      ...section,
      visibleEntries: isExpanded ? section.entries : section.entries.slice(0, visibleLimit),
      overflowEntryCount: Math.max(section.entries.length - visibleLimit, 0),
      isExpanded
    };
  });
