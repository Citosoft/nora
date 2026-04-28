import type { WorkspaceSidebarWorkspacesHeaderProps } from "@/components/app/types/workspaceSidebarWorkspacesHeader.types";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, FolderGit2, Plus, RefreshCcw, Trash2, X } from "lucide-react";

export const WorkspaceSidebarWorkspacesHeader = (props: WorkspaceSidebarWorkspacesHeaderProps) => {
  const { workspaceGroupIds, allWorkspaceGroupsCollapsed, onChooseProject, onToggleCollapseAllWorkspaces, onResetWorkspaces, variant } =
    props;
  const hasWorkspaceGroups = workspaceGroupIds.length > 0;

  return (
    <div className="flex h-[52px] items-center justify-between bg-background/70 px-4">
      <div className="text-[12px] font-medium text-muted-foreground">Workspaces</div>
      <div className="flex items-center gap-1">
        {variant === "active-project" ? (
          <Button variant="ghost" size="icon" className="size-8" onClick={onChooseProject} aria-label="Add workspace">
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="size-8" onClick={onChooseProject} aria-label="Choose project">
            <FolderGit2 className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onToggleCollapseAllWorkspaces}
          disabled={!hasWorkspaceGroups}
          aria-label={allWorkspaceGroupsCollapsed ? "Expand all workspaces" : "Collapse all workspaces"}
        >
          <ChevronsUpDown className="size-4" />
        </Button>
        {variant === "active-project" ? (
          <Button variant="ghost" size="icon" className="size-8" onClick={props.onRefresh} aria-label="Refresh workspace">
            <RefreshCcw className="size-4" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" className="size-8" onClick={onResetWorkspaces} aria-label="Reset workspaces">
          <Trash2 className="size-4" />
        </Button>
        {variant === "active-project" ? (
          <Button variant="ghost" size="icon" className="size-8" onClick={props.onCloseProject} aria-label="Exit workspace">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
