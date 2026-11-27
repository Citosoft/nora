import type { BackgroundTask } from "@shared/types/conversation/contracts.types";

/** Whether two full-replace background-task lists describe the same live work. */
export function sameBackgroundTasks(left: readonly BackgroundTask[], right: readonly BackgroundTask[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((task, index) => {
    const other = right[index];
    return !!other && task.id === other.id && task.description === other.description && task.kind === other.kind;
  });
}

/** Compact status copy for the thread chrome; null when nothing is running in the background. */
export function backgroundTasksStatus(tasks: readonly BackgroundTask[]): { count: number; title: string; descriptions: string[] } | null {
  if (!tasks.length) return null;
  const descriptions = tasks.map((task) => task.description);
  const count = tasks.length;
  return {
    count,
    title: count === 1 ? "Running in background" : `Running in background (${count})`,
    descriptions
  };
}
