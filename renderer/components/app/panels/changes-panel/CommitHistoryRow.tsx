import { GitCommitHorizontal } from "lucide-react";
import type { CommitHistoryRowProps } from "@/components/app/types/changesPanelSections.types";
import { cn } from "@/lib/utils";

export function CommitHistoryRow({ entry, timestamp, selected, onInspect }: CommitHistoryRowProps) {
  return <button type="button" aria-pressed={selected} onClick={() => onInspect(entry.hash)} title={`${entry.subject}\n${entry.author} · ${timestamp} · ${entry.shortHash}`}
    className={cn("flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected ? "bg-secondary" : "hover:bg-muted/60")}>
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground"><GitCommitHorizontal className="size-3.5" aria-hidden="true" /></span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[11.5px]">{entry.subject}</span>
      <span className="block truncate text-[10px] text-muted-foreground">{entry.author} · {timestamp}</span>
    </span>
    <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">{entry.shortHash}</span>
  </button>;
}
