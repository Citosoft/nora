import { Copy, FolderOpen, Pin, PinOff, Plus, RefreshCcw } from "lucide-react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useWorkspaceAvatarColorChoice } from "@/components/app/hooks/useWorkspaceAvatarColorChoice";
import { useWorkspaceAvatarSource } from "@/components/app/hooks/useWorkspaceAvatarSource";
import { useWorkspacePin } from "@/components/app/hooks/useWorkspacePin";
import type { WorkspaceManageMenuItemsProps } from "@/components/app/types/workspaceNavigation.types";
import { DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { WorkspaceColorSwatches } from "./WorkspaceColorSwatches";

/** Workspace section of the workspace actions menu: pinning, avatar colour, folder shortcuts and refresh. */
export function WorkspaceManageMenuItems({ workspace, onItemSelected }: WorkspaceManageMenuItemsProps) {
  const { id, rootPath } = workspace.project;
  const actions = useWorkspaceSidebarActions();
  const { pinned, togglePinned } = useWorkspacePin(id);
  const { selectedColor, chooseColor } = useWorkspaceAvatarColorChoice(id);
  // Only initials avatars have a colour; photos and project logos have none to pick.
  const hasColor = useWorkspaceAvatarSource(id).kind === "initials";
  const onSelectWithClose = (action: () => void) => { action(); onItemSelected?.(); };
  return <DropdownMenuGroup label="Workspace">
    <DropdownMenuItem onSelect={togglePinned}>{pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}{pinned ? "Unpin workspace" : "Pin workspace"}</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onSelectWithClose(() => void noraSystemClient.revealFileInFolder(rootPath))}><FolderOpen className="size-4" />Reveal in folder</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => void noraSystemClient.copyText(rootPath)}><Copy className="size-4" />Copy path</DropdownMenuItem>
    <DropdownMenuItem onSelect={actions.onRefresh}><RefreshCcw className="size-4" />Refresh workspace</DropdownMenuItem>
    <DropdownMenuItem onSelect={actions.onChooseProject}><Plus className="size-4" />Add workspace…</DropdownMenuItem>
    {hasColor && <DropdownMenuGroup label="Avatar color" nested>
      <WorkspaceColorSwatches compact selectedColor={selectedColor} onChoose={chooseColor} />
    </DropdownMenuGroup>}
  </DropdownMenuGroup>;
}
