type WorkspaceSidebarWorkspacesHeaderShared = {
  workspaceGroupIds: string[];
  allWorkspaceGroupsCollapsed: boolean;
  onChooseProject: () => void;
  onToggleCollapseAllWorkspaces: () => void;
  onResetWorkspaces: () => void;
};

export type WorkspaceSidebarWorkspacesHeaderProps =
  | (WorkspaceSidebarWorkspacesHeaderShared & {
      variant: "active-project";
      onRefresh: () => void;
      onCloseProject: () => void;
    })
  | (WorkspaceSidebarWorkspacesHeaderShared & { variant: "no-project" });
