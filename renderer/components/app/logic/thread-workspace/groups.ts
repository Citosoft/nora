import type { ThreadGrouping, ThreadNavigationGroup } from "@/components/app/types/thread-workspace/navigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";

export const threadGroupingOptions: readonly { id: ThreadGrouping; label: string }[] = [
  { id: "none", label: "No grouping" },
  { id: "workspace", label: "Workspace" },
  { id: "activity", label: "Activity" }
];

/** Input is already filtered and sorted by navigation; retain that order inside each group. */
export function buildThreadGroups(
  rows: readonly ThreadNavigationRow[],
  grouping: ThreadGrouping,
  workspaces: ReadonlyMap<string, WorkspaceAvatarIdentity>
): ThreadNavigationGroup[] {
  if (!rows.length) return [];
  if (grouping === "none") return [{ id: "all", label: null, workspace: null, rows }];
  const pinned = rows.filter((row) => row.pinned);
  const remaining = rows.filter((row) => !row.pinned);
  const groups: ThreadNavigationGroup[] = pinned.length
    ? [{ id: "pinned", label: "Pinned", workspace: null, rows: pinned }]
    : [];
  if (grouping === "workspace") {
    const byWorkspace = new Map<string, ThreadNavigationRow[]>();
    for (const row of remaining) {
      const entries = byWorkspace.get(row.workspaceId) ?? [];
      entries.push(row);
      byWorkspace.set(row.workspaceId, entries);
    }
    const workspaceGroups = Array.from(byWorkspace, ([id, entries]) => {
      const workspace = workspaces.get(id) ?? { id, name: "Unavailable workspace" };
      return { id: `workspace:${id}`, label: workspace.name, workspace, rows: entries };
    });
    return [...groups, ...workspaceGroups.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))];
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
