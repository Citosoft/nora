import { getTaskBoardSectionTitle, sortTasksForBoard } from "@/components/app/logic/taskBoardUtils";
import type { WorkspaceTaskBoard, WorkspaceTaskSummary } from "@shared/appTypes";
import type { UpcomingTasks } from "@/components/app/types/workspace-home/tasks.types";

export const HOME_TASK_LIMIT = 5;

/** Open tasks in board order (section, then position), so the home shows what the board says comes next. */
export function selectUpcomingTasks(tasks: readonly WorkspaceTaskSummary[], board: WorkspaceTaskBoard, limit = HOME_TASK_LIMIT): UpcomingTasks {
  const open = sortTasksForBoard(tasks.filter((task) => !task.completed), board);
  return {
    tasks: open.slice(0, limit).map((task) => ({ task, sectionTitle: getTaskBoardSectionTitle(task.path, board) })),
    more: Math.max(0, open.length - limit)
  };
}
