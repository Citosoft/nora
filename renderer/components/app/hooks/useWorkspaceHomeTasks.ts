import { useMemo } from "react";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useCanonicalAppSnapshot } from "./useAppDomainState";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import { selectUpcomingTasks } from "@/components/app/logic/workspace-home/upcomingTasks";
import type { WorkspaceHomeTasksState } from "@/components/app/types/workspace-home/tasks.types";

/** The project's next open tasks from its board, with the board's own open and start actions. */
export function useWorkspaceHomeTasks(projectId: string): WorkspaceHomeTasksState {
  const { taskCenterProps } = useAppMainCenterContent();
  const { workspaceTasks, workspaceTaskBoards, onOpenTask, onStartTaskThreads } = taskCenterProps;
  const snapshot = useCanonicalAppSnapshot();
  const { openTool } = useWorkspaceNavigation();
  const entry = workspaceTasks[projectId];
  const boardEntry = workspaceTaskBoards[projectId];
  const upcoming = useMemo(() => selectUpcomingTasks(entry?.tasks ?? [], boardEntry?.board ?? createDefaultWorkspaceTaskBoard()), [entry?.tasks, boardEntry?.board]);
  const project = snapshot?.project?.id === projectId ? snapshot.project : snapshot?.workspaces.find((workspace) => workspace.project.id === projectId)?.project ?? null;
  return {
    ...upcoming,
    loading: !!entry?.isLoading && !entry.tasks.length,
    error: entry?.errorMessage ?? boardEntry?.errorMessage ?? null,
    open: ({ task }) => onOpenTask(projectId, task.path),
    async start({ task }) {
      if (!project) throw new Error("This workspace's project is not loaded yet.");
      await onStartTaskThreads([{ projectId, projectName: project.name, projectRootPath: project.rootPath, path: task.path, title: task.title }]);
    },
    openBoard: () => openTool(projectId, "tasks")
  };
}
