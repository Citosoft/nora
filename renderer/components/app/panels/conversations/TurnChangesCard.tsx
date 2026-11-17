import { useId, useState } from "react";
import { ChevronDown, FileDiff, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patchLineCounts, sumPatchLineCounts } from "@shared/conversations/diff";
import type { TurnChangesCardProps } from "@/components/app/types/nativeDiff.types";
import { DiffCounts } from "./DiffCounts";
import { NativeDiff } from "./NativeDiff";

const previewLimit = 3;

export function TurnChangesCard({ review }: TurnChangesCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [viewChanges, setViewChanges] = useState(false);
  const filesId = useId();
  const noteId = useId();
  const count = review.changes.length;
  if (count === 0) return null;

  const hiddenCount = Math.max(0, count - previewLimit);
  const visible = showAll || viewChanges ? review.changes : review.changes.slice(0, previewLimit);
  const partial = review.changes.some((change) => patchLineCounts(change.patch) === null);
  return <section aria-label="Turn file changes" aria-describedby={noteId} className="overflow-hidden rounded-lg border border-border bg-card/50 text-sm [&_pre]:rounded-md">
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-background/70 text-muted-foreground"><FileDiff className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><h3 className="font-medium">Edited {count} {count === 1 ? "file" : "files"}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2"><DiffCounts counts={sumPatchLineCounts(review.changes.map((change) => change.patch))} />{partial && <span className="text-xs text-muted-foreground">Partial line counts</span>}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" disabled aria-label="Undo unavailable for turn changes" tooltip="Undo is not available for turn reviews.">Undo<Undo2 className="size-3.5" aria-hidden="true" /></Button>
        <Button type="button" variant="outline" size="sm" aria-expanded={viewChanges} aria-controls={filesId} onClick={() => setViewChanges((current) => !current)}>{viewChanges ? "Hide changes" : "View changes"}</Button>
      </div>
    </header>
    <div id={filesId} className="min-w-0">{visible.map((change) => {
      const separator = change.path.lastIndexOf("/");
      return <details key={change.path} open={viewChanges || undefined} className="group/file min-w-0">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden" title={change.path}>
          <span className="min-w-0 flex-1 truncate"><span className="text-muted-foreground">{change.path.slice(0, separator + 1)}</span><span>{change.path.slice(separator + 1)}</span></span>
          <DiffCounts counts={patchLineCounts(change.patch)} />
          {!change.patch && <span className="shrink-0 text-xs text-muted-foreground">{change.presentation === "binary" ? "Binary" : "Diff unavailable"}</span>}
        </summary>
        <div className="px-4 pb-3">{change.patch ? <NativeDiff patch={change.patch} /> : <p className="text-xs text-muted-foreground">{change.presentation === "binary" ? "Binary file changed." : "Patch exceeds the preview limit."}</p>}</div>
      </details>;
    })}</div>
    {hiddenCount > 0 && !viewChanges && <button type="button" className="flex w-full items-center gap-2 border-t bg-muted/30 px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-expanded={showAll} aria-controls={filesId} onClick={() => setShowAll((current) => !current)}>
      {showAll ? "Show fewer files" : `Show ${hiddenCount} more ${hiddenCount === 1 ? "file" : "files"}`}<ChevronDown className={`size-4 ${showAll ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>}
    <p id={noteId} className="sr-only">Changes observed between turn checkpoints; other workspace edits may be included. Undo is unavailable.</p>
  </section>;
}
