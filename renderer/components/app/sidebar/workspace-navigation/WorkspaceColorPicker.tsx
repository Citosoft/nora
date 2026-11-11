import { useState } from "react";
import { Check } from "lucide-react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { workspaceAvatarColors } from "@/components/app/logic/workspace-navigation/avatar";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import type { WorkspaceAvatarColor, WorkspaceColorPickerProps } from "@/components/app/types/workspaceAvatar.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function WorkspaceColorPicker({ workspace }: WorkspaceColorPickerProps) {
  const [open, setOpen] = useState(false);
  const { preferences, setPreferences } = useWorkspaceNavigation();
  const selectedColor = preferences.workspaceAvatarColors[workspace.id];
  const chooseColor = (color: WorkspaceAvatarColor | null) => {
    setPreferences((current) => {
      const workspaceAvatarColors = { ...current.workspaceAvatarColors };
      if (color) workspaceAvatarColors[workspace.id] = color;
      else delete workspaceAvatarColors[workspace.id];
      return { ...current, workspaceAvatarColors };
    });
    setOpen(false);
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="ml-1 size-9 shrink-0" aria-label={`Change avatar color for ${workspace.name}`} tooltip="Change avatar color">
      <WorkspaceAvatar workspace={workspace} />
    </Button></PopoverTrigger>
    <PopoverContent side="right" align="start" className="w-52 p-3" aria-label={`Avatar color for ${workspace.name}`}>
      <p className="truncate text-xs font-medium" title={workspace.name}>{workspace.name}</p>
      <div role="group" aria-label="Avatar colors" className="my-3 grid grid-cols-4 gap-2">
        {workspaceAvatarColors.map((color) => <button key={color.id} type="button" aria-label={color.label} aria-pressed={selectedColor === color.id}
          title={color.label} onClick={() => chooseColor(color.id)}
          className={`flex size-8 items-center justify-center rounded-md text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${color.className} ${selectedColor === color.id ? "ring-2 ring-ring ring-offset-2" : "hover:opacity-80"}`}>
          {selectedColor === color.id && <Check className="size-4" aria-hidden="true" />}
        </button>)}
      </div>
      <Button variant="ghost" className="h-7 w-full justify-start px-1 text-xs" aria-pressed={!selectedColor} onClick={() => chooseColor(null)}>
        {selectedColor ? "Use automatic color" : "Automatic color"}
      </Button>
    </PopoverContent>
  </Popover>;
}
