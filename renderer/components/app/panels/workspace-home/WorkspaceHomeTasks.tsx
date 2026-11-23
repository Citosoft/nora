import { useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceHomeTasks } from "@/components/app/hooks/useWorkspaceHomeTasks";
import type { UpcomingTask, WorkspaceHomeTasksProps } from "@/components/app/types/workspace-home/tasks.types";

/** The board's next open tasks, each openable or handed straight to a new thread. */
export function WorkspaceHomeTasks({ projectId }: WorkspaceHomeTasksProps) {
  const { tasks, more, loading, error, open, start, openBoard } = useWorkspaceHomeTasks(projectId);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const run = async (task: UpcomingTask) => {
    if (starting) return;
    setStarting(task.task.path); setStartError(null);
    try { await start(task); } catch (cause) { setStartError(cause instanceof Error ? cause.message : "The thread could not be started."); } finally { setStarting(null); }
  };
  return <section aria-labelledby="home-tasks-title">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 id="home-tasks-title" className="text-sm font-medium">Next up</h2>
      <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={openBoard}>{more > 0 ? `All tasks (+${more})` : "Task board"}</Button>
    </div>
    {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
    {tasks.length ? <ul className="overflow-hidden rounded-lg border">
      {tasks.map((entry) => <li key={entry.task.path} className="group flex items-center gap-1 border-b last:border-0 hover:bg-muted/50">
        <button type="button" onClick={() => open(entry)} className="min-w-0 flex-1 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="block truncate text-sm" title={entry.task.title}>{entry.task.title}</span>
          <span className="block text-[11px] text-muted-foreground">{entry.sectionTitle}</span>
        </button>
        <Button type="button" variant="ghost" size="icon" className="mr-1 size-7 shrink-0 text-muted-foreground" disabled={!!starting}
          aria-label={`Start a thread on ${entry.task.title}`} tooltip="Start a thread on this task" onClick={() => void run(entry)}>
          {starting === entry.task.path ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
        </Button>
      </li>)}
    </ul> : <p role="status" className="rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">{loading ? "Loading tasks…" : "No open tasks. Plan what comes next on the task board."}</p>}
    {startError && <p role="alert" className="mt-2 text-xs text-destructive">{startError}</p>}
  </section>;
}
