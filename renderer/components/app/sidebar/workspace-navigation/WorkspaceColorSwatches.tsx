import { Check } from "lucide-react";
import { workspaceAvatarColors } from "@/components/app/logic/workspace-navigation/avatar";
import type { WorkspaceColorSwatchesProps } from "@/components/app/types/workspaceAvatar.types";
import { cn } from "@/lib/utils";

export function WorkspaceColorSwatches({ selectedColor, onChoose, compact = false }: WorkspaceColorSwatchesProps) {
  return <div role="group" aria-label="Avatar colors" className={compact ? "flex flex-wrap gap-1.5 px-2 py-1.5" : "my-3 grid grid-cols-4 gap-2"}>
    {workspaceAvatarColors.map((color) => {
      const selected = selectedColor === color.id;
      return <button key={color.id} type="button" aria-label={color.label} aria-pressed={selected} title={color.label} onClick={() => onChoose(color.id)}
        className={cn("flex items-center justify-center rounded-md text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          compact ? "size-5" : "size-8", color.className, selected ? "ring-2 ring-ring ring-offset-2" : "hover:opacity-80")}>
        {selected && <Check className={compact ? "size-3" : "size-4"} aria-hidden="true" />}
      </button>;
    })}
    {compact && <button type="button" aria-pressed={!selectedColor} onClick={() => onChoose(null)}
      className={cn("h-5 rounded-md px-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedColor ? "text-muted-foreground hover:bg-accent/60" : "bg-accent/60 text-popover-foreground")}>
      Auto
    </button>}
  </div>;
}
