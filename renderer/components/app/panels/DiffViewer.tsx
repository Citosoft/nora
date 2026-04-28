import { diffLineClass } from "@/components/app/logic/utils";
import type { ResolvedTheme } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChangeEntry } from "@shared/appTypes";
import { Expand, FolderGit2 } from "lucide-react";

export function DiffViewer({
  change,
  expanded = false,
  resolvedTheme,
  onClose,
  onExpand
}: {
  change: ChangeEntry;
  expanded?: boolean;
  resolvedTheme: ResolvedTheme;
  onClose?: () => void;
  onExpand?: () => void;
}) {
  const changeTone = (status: ChangeEntry["status"]) => {
    switch (status) {
      case "added":
        return "text-emerald-500";
      case "deleted":
        return "text-destructive";
      case "modified":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-background/10", expanded ? "h-full" : "")}>
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <FolderGit2 className="size-3.5" />
              {expanded ? "Expanded diff" : "Selected file"}
            </div>
            <div className="mt-1 truncate text-sm font-medium" title={change.path}>
              {change.path}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("shrink-0 text-xs font-semibold uppercase tracking-[0.12em]", changeTone(change.status))}>
              {change.status}
            </div>
            {expanded && onClose ? (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            ) : null}
            {!expanded && onExpand ? (
              <Button variant="outline" size="sm" onClick={onExpand}>
                <Expand className="size-3.5" />
                Expand diff
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className={cn("terminal-text min-h-0 flex-1 overflow-auto bg-background/20 text-[12px] leading-6", expanded ? "p-5" : "p-4")}>
        {change.diff.split("\n").map((line, index) => (
          <div key={`${index}-${line}`} className={cn("whitespace-pre-wrap break-words px-2", diffLineClass(line, resolvedTheme))}>
            {line || " "}
          </div>
        ))}
      </div>
    </div>
  );
}
