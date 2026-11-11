import { threadAppSource, threadSourceOptions } from "./sources";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ThreadGrouping, ThreadNavigationGroup } from "@/components/app/types/thread-workspace/navigation.types";
import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";

export const threadGroupingOptions: readonly { id: ThreadGrouping; label: string }[] = [
  { id: "none", label: "No grouping" },
  { id: "workspace", label: "Workspace" },
  { id: "activity", label: "Activity" },
  { id: "source", label: "Source" },
  { id: "provider", label: "Provider" }
];

/** Preserve the saved preference while applying only grouping supported by the current scope. */
export function resolveThreadGrouping(grouping: ThreadGrouping, allWorkspaces: boolean): ThreadGrouping {
  return grouping === "workspace" && !allWorkspaces ? "none" : grouping;
}

export function availableThreadGroupings(allWorkspaces: boolean) {
  return threadGroupingOptions.filter((option) => allWorkspaces || option.id !== "workspace");
}

function partitionRows<Key>(rows: readonly ThreadListRow[], key: (row: ThreadListRow) => Key): Map<Key, ThreadListRow[]> {
  const partitions = new Map<Key, ThreadListRow[]>();
  for (const row of rows) {
    const id = key(row);
    const entries = partitions.get(id) ?? [];
    entries.push(row);
    partitions.set(id, entries);
  }
  return partitions;
}

/** Input is already filtered and sorted by navigation; retain that order inside each group. */
export function buildThreadGroups(
  rows: readonly ThreadListRow[],
  grouping: ThreadGrouping,
  workspaces: ReadonlyMap<string, WorkspaceAvatarIdentity>,
  providers: ReadonlyMap<ProviderBinding["kind"], string> = new Map()
): ThreadNavigationGroup[] {
  if (!rows.length) return [];
  if (grouping === "none") return [{ id: "all", label: null, workspace: null, rows }];
  const pinned = rows.filter((row) => row.pinned);
  const remaining = rows.filter((row) => !row.pinned);
  const groups: ThreadNavigationGroup[] = pinned.length
    ? [{ id: "pinned", label: "Pinned", workspace: null, rows: pinned }]
    : [];
  if (grouping === "workspace") {
    const byWorkspace = partitionRows(remaining, (row) => row.workspaceId);
    const workspaceGroups = Array.from(byWorkspace, ([id, entries]) => {
      const workspace = workspaces.get(id) ?? { id, name: "Unavailable workspace" };
      return { id: `workspace:${id}`, label: workspace.name, workspace, rows: entries };
    });
    return [...groups, ...workspaceGroups.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))];
  }
  if (grouping === "source") {
    for (const source of threadSourceOptions.filter((option) => option.id !== "all")) {
      const entries = remaining.filter((row) => threadAppSource(row) === source.id);
      if (entries.length) groups.push({ id: source.id, label: source.label, providerKind: source.providerKind, workspace: null, rows: entries });
    }
    return groups;
  }
  if (grouping === "provider") {
    const byProvider = partitionRows(remaining, (row) => row.providerKind);
    const providerGroups = Array.from(byProvider, ([kind, entries]) => ({
      id: `provider:${kind ?? "none"}`, label: kind ? providers.get(kind) ?? kind : "No provider", providerKind: kind, workspace: null, rows: entries
    }));
    return [...groups, ...providerGroups.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))];
  }
  const activityGroups = [
    { id: "attention", label: "Needs attention" },
    { id: "active", label: "In progress" },
    { id: "drafts", label: "Drafts" },
    { id: "idle", label: "Other threads" }
  ];
  for (const group of activityGroups) {
    const entries = remaining.filter((row) => {
      const activity = row.attention || row.unread ? "attention" : row.active ? "active" : row.target.kind === "draft" ? "drafts" : "idle";
      return activity === group.id;
    });
    if (entries.length) groups.push({ ...group, workspace: null, rows: entries });
  }
  return groups;
}
