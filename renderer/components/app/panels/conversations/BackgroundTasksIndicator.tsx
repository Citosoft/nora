import { ThinkingOrb } from "thinking-orbs";
import { backgroundTasksStatus } from "@shared/conversations/backgroundTasks";
import type { BackgroundTasksIndicatorProps } from "@/components/app/types/backgroundTasksIndicator.types";

/** Live background work still running between turns; sits in the composer chrome, not the transcript. */
export function BackgroundTasksIndicator({ tasks }: BackgroundTasksIndicatorProps) {
  const status = backgroundTasksStatus(tasks);
  if (!status) return null;
  return <div role="status" aria-live="polite" className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
    <p className="flex items-center gap-2">
      <ThinkingOrb state="working" size={32} className="shrink-0" aria-hidden />
      <span className="min-w-0 truncate text-shimmer font-medium text-foreground">{status.title}</span>
    </p>
    <ul className="mt-1 space-y-0.5 pl-8">
      {tasks.map((task) => <li key={task.id} className="truncate">{task.description}</li>)}
    </ul>
  </div>;
}
