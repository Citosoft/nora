export function areAllWorkspaceGroupsCollapsed(
  workspaceIds: string[],
  collapsedWorkspaceIds: Record<string, boolean>
): boolean {
  return workspaceIds.length > 0 && workspaceIds.every((workspaceId) => collapsedWorkspaceIds[workspaceId] === true);
}

export function createWorkspaceCollapseMap(
  workspaceIds: string[],
  collapsed: boolean
): Record<string, boolean> {
  return workspaceIds.reduce<Record<string, boolean>>((accumulator, workspaceId) => {
    accumulator[workspaceId] = collapsed;
    return accumulator;
  }, {});
}
