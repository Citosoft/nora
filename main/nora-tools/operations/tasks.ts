import { taskIdFromPath } from "@shared/taskIdentity";
import type { WorkspaceTaskBoard, WorkspaceTaskSummary } from "@shared/appTypes";
import type { NoraTaskInfo, NoraTaskOperations, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraTaskStore, NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

function taskInfo(task: WorkspaceTaskSummary, board: WorkspaceTaskBoard): NoraTaskInfo {
  const sectionId = board.taskPositions[task.path]?.sectionId ?? board.sections[0]?.id ?? "todo";
  const section = board.sections.find((entry) => entry.id === sectionId);
  return { id: taskIdFromPath(task.path), path: task.path, title: task.title, columnId: sectionId, column: section?.title ?? sectionId, completed: task.completed };
}

export function createTaskOperations(options: NoraToolOperationOptions): NoraTaskOperations {
  /** Task boards belong to project workspaces; Personal and unbound folders have none. */
  const target = ({ conversation }: NoraToolContext): { store: NoraTaskStore; projectId: string } => {
    if (!options.tasks) throw new Error("The task board is unavailable here.");
    const projectId = options.boot().workspaces.find((entry) => entry.id === conversation.workspace.projectId)?.shellProjectId;
    if (!projectId) throw new Error("This thread's workspace has no task board. Task boards belong to project workspaces.");
    return { store: options.tasks, projectId };
  };
  const snapshot = async (context: NoraToolContext): Promise<{ tasks: WorkspaceTaskSummary[]; board: WorkspaceTaskBoard; store: NoraTaskStore; projectId: string }> => {
    const { store, projectId } = target(context);
    const [tasks, board] = await Promise.all([store.list(projectId), store.board(projectId)]);
    return { tasks, board, store, projectId };
  };
  const findTask = (tasks: WorkspaceTaskSummary[], id: string): WorkspaceTaskSummary => {
    const matches = tasks.filter((task) => taskIdFromPath(task.path) === id);
    if (matches.length !== 1) throw new Error(matches.length ? `Task id "${id}" is ambiguous. Rename the duplicate task files.` : `No task with id "${id}". Call list_tasks for the ids.`);
    return matches[0];
  };
  const transition = async (id: string, completed: boolean, context: NoraToolContext): Promise<NoraTaskInfo> => {
    const { tasks, board, store, projectId } = await snapshot(context);
    const task = findTask(tasks, id);
    const sectionId = completed ? "done" : "in-progress";
    if (!board.sections.some((section) => section.id === sectionId)) {
      throw new Error(`The task board has no "${sectionId}" column. Restore that column before changing task status.`);
    }
    const relative = task.path.slice(".nora/tasks/".length).replace(/^completed\//, "");
    const path = `.nora/tasks/${completed ? "completed/" : ""}${relative}`;
    const last = Math.max(-1, ...Object.entries(board.taskPositions).filter(([key, position]) => key !== task.path && position.sectionId === sectionId).map(([, position]) => position.order));
    const taskPositions = { ...board.taskPositions };
    const taskAssignments = { ...board.taskAssignments };
    const previousPosition = taskPositions[task.path];
    delete taskPositions[task.path];
    delete taskAssignments[task.path];
    taskPositions[path] = previousPosition?.sectionId === sectionId ? previousPosition : { sectionId, order: last + 1 };
    if (board.taskAssignments[task.path]) taskAssignments[path] = board.taskAssignments[task.path];
    // Capture board metadata before moving: the workspace store may prune the old path during the move.
    if (path !== task.path) await store.move(projectId, task.path, path);
    const saved = await store.saveBoard(projectId, { ...board, taskPositions, taskAssignments });
    options.onTasksChanged?.(projectId);
    return taskInfo({ ...task, path, completed }, saved);
  };
  return {
    async read(id, context) {
      const { tasks, board, store, projectId } = await snapshot(context);
      const task = findTask(tasks, id);
      return { task: taskInfo(task, board), content: await store.read(projectId, task.path) };
    },
    start: (id, context) => transition(id, false, context),
    finish: (id, context) => transition(id, true, context),
    async list(context) {
      const { tasks, board } = await snapshot(context);
      const order = (path: string): number => board.taskPositions[path]?.order ?? Number.MAX_SAFE_INTEGER;
      const sections = board.sections.map((section) => section.id);
      return tasks.map((task) => taskInfo(task, board))
        .sort((a, b) => sections.indexOf(a.columnId) - sections.indexOf(b.columnId) || order(a.path) - order(b.path));
    },
    async create(title, details, context) {
      const { store, projectId } = target(context);
      const path = await store.create(projectId, title, `# ${title}\n${details ? `\n${details}\n` : ""}`);
      options.onTasksChanged?.(projectId);
      const { tasks, board } = await snapshot(context);
      const task = tasks.find((entry) => entry.path === path);
      if (!task) throw new Error("The task was written but did not appear on the board. Refresh the task board.");
      return taskInfo(task, board);
    },
    async move(path, column, context) {
      const { tasks, board, store, projectId } = await snapshot(context);
      const task = tasks.find((entry) => entry.path === path);
      if (!task) throw new Error(`No task at "${path}". Call list_tasks for the paths.`);
      const wanted = column.trim().toLocaleLowerCase();
      const section = board.sections.find((entry) => entry.id.toLocaleLowerCase() === wanted || entry.title.toLocaleLowerCase() === wanted);
      if (!section) throw new Error(`No column "${column}". Columns: ${board.sections.map((entry) => entry.title).join(", ")}.`);
      const last = Math.max(-1, ...Object.entries(board.taskPositions).filter(([key, position]) => key !== path && position.sectionId === section.id).map(([, position]) => position.order));
      const saved = await store.saveBoard(projectId, { ...board, taskPositions: { ...board.taskPositions, [path]: { sectionId: section.id, order: last + 1 } } });
      options.onTasksChanged?.(projectId);
      return taskInfo(task, saved);
    }
  };
}
