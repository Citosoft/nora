import { useState } from "react";
import { useWorkspaceAvatarColorChoice } from "@/components/app/hooks/useWorkspaceAvatarColorChoice";
import { useWorkspaceAvatarSource } from "@/components/app/hooks/useWorkspaceAvatarSource";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import type { WorkspaceAvatarColor, WorkspaceColorPickerProps } from "@/components/app/types/workspaceAvatar.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceColorSwatches } from "./WorkspaceColorSwatches";

export function WorkspaceColorPicker({ workspace }: WorkspaceColorPickerProps) {
  const [open, setOpen] = useState(false);
  const { selectedColor, chooseColor: setColor } = useWorkspaceAvatarColorChoice(workspace.id);
  const source = useWorkspaceAvatarSource(workspace.id);
  // Only initials use a color; the user's photo, Personal artwork and project logos have none to pick.
  if (source.kind !== "initials") return <span className="ml-1 flex size-9 shrink-0 items-center justify-center"><WorkspaceAvatar workspace={workspace} /></span>;
  const chooseColor = (color: WorkspaceAvatarColor | null) => {
    setColor(color);
    setOpen(false);
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="ml-1 size-9 shrink-0" aria-label={`Change avatar color for ${workspace.name}`} tooltip="Change avatar color">
      <WorkspaceAvatar workspace={workspace} />
    </Button></PopoverTrigger>
    <PopoverContent side="right" align="start" className="w-52 p-3" aria-label={`Avatar color for ${workspace.name}`}>
      <p className="truncate text-xs font-medium" title={workspace.name}>{workspace.name}</p>
      <WorkspaceColorSwatches selectedColor={selectedColor} onChoose={chooseColor} />
      <Button variant="ghost" className="h-7 w-full justify-start px-1 text-xs" aria-pressed={!selectedColor} onClick={() => chooseColor(null)}>
        {selectedColor ? "Use automatic color" : "Automatic color"}
      </Button>
    </PopoverContent>
  </Popover>;
}
