import { getPathLeafName } from "@/components/app/logic/pathLeaf";
import type { SessionFolderBadgeProps } from "@/components/app/types/sessionToolbarBadges.types";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Folder } from "lucide-react";

/** The checkout folder a session runs in, with the full path on hover. */
export function SessionFolderBadge({ workspace, className }: SessionFolderBadgeProps) {
  const folderName = getPathLeafName(workspace);
  if (!folderName) {
    return null;
  }

  return (
    <Tooltip content={workspace}>
      <Badge
        variant="outline"
        className={cn(
          "max-w-[14rem] gap-1 border-border/70 bg-muted/50 text-[11px] font-medium leading-none text-foreground",
          "dark:border-border/90 dark:bg-muted/25 dark:text-foreground/95",
          className
        )}
      >
        <Folder className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{folderName}</span>
      </Badge>
    </Tooltip>
  );
}
