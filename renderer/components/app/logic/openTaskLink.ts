import { taskIdFromPath } from "@shared/taskIdentity";
import type { TaskLinkTarget } from "@shared/types/taskLink.types";
import type { TaskLinkOpenerDeps } from "@/components/app/types/taskLinks.types";

export async function openTaskLink(target: TaskLinkTarget, deps: TaskLinkOpenerDeps): Promise<void> {
  const tasks = await deps.listTasks(target.projectId);
  const matches = tasks.filter((task) => taskIdFromPath(task.path) === target.taskId);
  if (matches.length !== 1) throw new Error(matches.length ? "This task link is ambiguous." : "This task is no longer available.");
  // The task editor owns workspace selection; pre-focusing reloads even an already active project.
  await deps.openTaskEditor(target.projectId, matches[0].path);
}
