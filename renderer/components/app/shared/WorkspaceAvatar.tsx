import { useState } from "react";
import { workspaceAvatarColor, workspaceInitials } from "@/components/app/logic/workspace-navigation/avatar";
import type { WorkspaceAvatarProps } from "@/components/app/types/workspaceAvatar.types";
import { useWorkspaceAvatarColor } from "@/components/app/hooks/useWorkspaceAvatarColor";
import { useWorkspaceAvatarSource } from "@/components/app/hooks/useWorkspaceAvatarSource";
import { AccountAvatarImage } from "./AccountAvatarImage";
import { PersonalWorkspaceArt } from "./PersonalWorkspaceArt";

export function WorkspaceAvatar({ workspace, size = "default" }: WorkspaceAvatarProps) {
  const selectedColor = useWorkspaceAvatarColor(workspace.id);
  const source = useWorkspaceAvatarSource(workspace.id);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const sizeClass = size === "small" ? "size-5 text-[9px]" : "size-7 text-[10px]";
  const frame = `inline-flex shrink-0 select-none overflow-hidden rounded-md ${sizeClass}`;
  if (source.kind === "personal") return <span aria-hidden="true" title={workspace.name} data-workspace-avatar={workspace.id} className={frame}>
    <AccountAvatarImage fallback={<PersonalWorkspaceArt className="size-full" />} />
  </span>;
  // Logos are mostly drawn for light backgrounds, so they sit on a white tile in either theme.
  if (source.kind === "logo" && failedLogo !== source.dataUrl) return <span aria-hidden="true" title={workspace.name} data-workspace-avatar={workspace.id}
    className={`${frame} items-center justify-center bg-white p-0.5 ring-1 ring-inset ring-black/10`}>
    <img src={source.dataUrl} alt="" className="size-full object-contain" onError={() => setFailedLogo(source.dataUrl)} />
  </span>;
  return <span aria-hidden="true" title={workspace.name} data-workspace-avatar={workspace.id}
    className={`${frame} items-center justify-center font-semibold leading-none tracking-wide text-white ${workspaceAvatarColor(workspace.id, selectedColor)}`}>
    {workspaceInitials(workspace.name)}
  </span>;
}
