import { workspaceAvatarColor, workspaceInitials } from "@/components/app/logic/workspace-navigation/avatar";
import type { WorkspaceAvatarProps } from "@/components/app/types/workspaceAvatar.types";
import { useWorkspaceAvatarColor } from "@/components/app/hooks/useWorkspaceAvatarColor";

export function WorkspaceAvatar({ workspace, size = "default" }: WorkspaceAvatarProps) {
  const selectedColor = useWorkspaceAvatarColor(workspace.id);
  return <span aria-hidden="true" title={workspace.name} data-workspace-avatar={workspace.id}
    className={`inline-flex shrink-0 select-none items-center justify-center rounded-md font-semibold leading-none tracking-wide text-white ${workspaceAvatarColor(workspace.id, selectedColor)} ${size === "small" ? "size-5 text-[9px]" : "size-7 text-[10px]"}`}>
    {workspaceInitials(workspace.name)}
  </span>;
}
