import { Check, FilePenLine, LoaderCircle, Undo2 } from "lucide-react";
import { canEditChange, changeGlyph, changeTone, isUntrackedChange, splitChangePath } from "@/components/app/logic/changeEntryPresentation";
import { DiffReviewCountBadge } from "@/components/app/panels/diff-annotation/DiffReviewTray";
import type { ChangedFileRowProps } from "@/components/app/types/changesPanelSections.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One changed file: name first, folder secondary. Discard and edit float over the row's right edge on hover or focus,
 * so no space is reserved for them while hidden.
 */
export function ChangedFileRow({ change, selected, annotationCount, workingTree, onSelect }: ChangedFileRowProps) {
  const { name, directory } = splitChangePath(change.path);
  const untracked = isUntrackedChange(change);
  return <div className={cn("group relative flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors", selected ? "bg-secondary" : "hover:bg-muted")}>
    {/* A neutral check: the accent colour on every row drew more attention than the file names. */}
    {workingTree && <span className="relative grid size-3.5 shrink-0 place-items-center">
      <input type="checkbox" checked={workingTree.included} onChange={workingTree.onToggleIncluded} aria-label={`Include ${change.path} in commit`}
        className="peer size-3.5 cursor-pointer appearance-none rounded-[4px] border border-muted-foreground/40 bg-transparent transition-colors hover:border-muted-foreground/70 checked:border-muted-foreground/50 checked:bg-muted-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <Check aria-hidden="true" className="pointer-events-none absolute size-2.5 text-foreground/70 opacity-0 peer-checked:opacity-100" strokeWidth={3} />
    </span>}
    <button type="button" onClick={onSelect} title={`${change.path}\n${change.status} · +${change.additions} · -${change.deletions}`}
      className="flex min-w-0 flex-1 items-center gap-2 rounded py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("w-3 shrink-0 text-center font-mono text-[10px] font-semibold", changeTone(change.status))}>{changeGlyph(change.status)}</span>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="shrink-0 truncate text-[12.5px]">{name}</span>
        {directory && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{directory}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] tabular-nums">
        {change.additions > 0 && <span className="text-emerald-500">+{change.additions}</span>}
        {change.deletions > 0 && <span className="text-destructive">−{change.deletions}</span>}
      </span>
      {annotationCount > 0 && <DiffReviewCountBadge count={annotationCount} />}
    </button>
    {workingTree && <span className={cn("pointer-events-none absolute inset-y-0 right-1 flex items-center bg-gradient-to-l pl-10 opacity-0 transition-opacity",
      "focus-within:pointer-events-auto focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
      selected ? "from-secondary from-60% to-transparent" : "from-muted from-60% to-transparent")}>
      <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" disabled={workingTree.discarding} onClick={workingTree.onDiscard}
        tooltip={untracked ? "Delete untracked file" : "Discard file changes"} aria-label={untracked ? `Delete ${change.path}` : `Discard changes in ${change.path}`}>
        {workingTree.discarding ? <LoaderCircle className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
      </Button>
      {canEditChange(change) && <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled={workingTree.discarding} onClick={workingTree.onEdit}
        tooltip="Edit file" aria-label={`Edit ${change.path}`}><FilePenLine className="size-3.5" /></Button>}
    </span>}
  </div>;
}
