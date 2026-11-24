import { DiffAnnotationIntroDialog } from "@/components/app/dialogs/DiffAnnotationIntroDialog";
import { useDiffLineLimit } from "@/components/app/hooks/useDiffLineLimit";
import { useDiffAnnotationIntroDialog } from "@/components/app/hooks/useDiffAnnotationIntroDialog";
import { AnnotatedDiffLines } from "@/components/app/panels/diff-annotation/AnnotatedDiffLines";
import type { ResolvedTheme } from "@/components/app/types";
import { DiffCounts } from "@/components/app/panels/conversations/DiffCounts";
import { ChangeStatusBadge } from "@/components/app/shared/ChangeStatusBadge";
import { FilePathLabel } from "@/components/app/shared/FilePathLabel";
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
  const diffAnnotationIntroDialog = useDiffAnnotationIntroDialog();
  const lineLimit = useDiffLineLimit(change.path);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", expanded ? "h-full" : "")}>
      <DiffAnnotationIntroDialog {...diffAnnotationIntroDialog} />
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FolderGit2 className="size-3.5" />
              {expanded ? "Expanded diff" : "Selected file"}
            </div>
            <FilePathLabel path={change.path} className="mt-1 block text-sm font-medium" />
          </div>
          <div className="flex items-center gap-3">
            <ChangeStatusBadge status={change.status} />
            <DiffCounts counts={{ additions: change.additions, deletions: change.deletions }} />
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
      <div className="min-h-0 flex-1 overflow-auto py-2">
        <AnnotatedDiffLines diff={change.diff} filePath={change.path} resolvedTheme={resolvedTheme} lineLimit={lineLimit} />
      </div>
    </div>
  );
}
