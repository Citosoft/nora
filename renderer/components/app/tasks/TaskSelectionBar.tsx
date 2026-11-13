import { LoaderCircle, Play, X } from "lucide-react";
import type { TaskSelectionBarProps } from "@/components/app/types/taskCenter.types";
import { Button } from "@/components/ui/button";

export function TaskSelectionBar({
  selectedCount,
  isStartingThreads,
  onClearTaskSelection,
  onStartSelectedThreads
}: TaskSelectionBarProps) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-3 border-t bg-muted/30 px-6 py-3"
      aria-label="Selected task actions"
    >
      <span role="status" className="mr-auto text-xs font-medium tabular-nums">
        {selectedCount} {selectedCount === 1 ? "task" : "tasks"} selected
      </span>
      <Button size="sm" className="h-8" onClick={() => void onStartSelectedThreads()} disabled={isStartingThreads}>
        {isStartingThreads ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {isStartingThreads ? "Starting…" : "Start threads"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onClearTaskSelection}
        disabled={isStartingThreads}
        aria-label="Clear task selection"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
