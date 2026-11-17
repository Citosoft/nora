import { CheckCircle2, Circle, Play, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskItemProps } from "@/components/app/types/taskCenter.types";

export function TaskItem({
  task,
  assignmentCount,
  selected,
  isStartingThreads,
  layout,
  onToggleSelection,
  onOpen,
  onStart,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragEnd
}: TaskItemProps) {
  const isBoard = layout === "board";
  return (
    <div
      draggable={isBoard && !task.completed}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-start gap-3 transition-colors",
        isBoard
          ? "rounded-lg border bg-background p-3 hover:border-border/80"
          : "border-b border-border/50 px-4 py-3.5 last:border-b-0 hover:bg-muted/40 sm:px-6",
        selected && "bg-primary/5",
        selected && isBoard && "border-primary/40",
        isBoard && !task.completed && "cursor-grab active:cursor-grabbing"
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelection}
        disabled={task.completed || isStartingThreads}
        aria-label={`Select ${task.title}`}
        className="form-control-surface mt-1 size-3.5 shrink-0 rounded border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              "block text-sm font-medium",
              isBoard ? "break-words" : "truncate",
              task.completed && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
          <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground/70" title={task.path}>
            {task.path}
          </span>
        </button>
        {(isBoard || assignmentCount > 0) && (
          <div className={cn("mt-2 flex items-center gap-2", !isBoard && "mt-1")}>
            {assignmentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="size-3" aria-hidden="true" />
                {assignmentCount} {assignmentCount === 1 ? "agent" : "agents"}
              </span>
            )}
            {isBoard && (
              <span className="text-[11px] text-muted-foreground">{task.completed ? "Completed" : "Open"}</span>
            )}
            {isBoard && <div className="flex-1" />}
            {isBoard && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={() => void onDelete()}
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!task.completed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            disabled={isStartingThreads}
            onClick={() => void onStart()}
            aria-label={`Start ${task.title}`}
            tooltip="Start task"
          >
            <Play className="size-3.5" aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7", task.completed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}
          onClick={() => void onToggleComplete()}
          aria-label={`${task.completed ? "Mark incomplete" : "Mark completed"}: ${task.title}`}
          tooltip={task.completed ? "Mark incomplete" : "Mark completed"}
        >
          {task.completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
        </Button>
        {!isBoard && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
            onClick={() => void onDelete()}
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
