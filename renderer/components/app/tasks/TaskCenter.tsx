import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { createTaskBoardSection, deleteTaskBoardSection, moveTaskToBoardSection, renameTaskBoardSection } from "@/components/app/logic/taskBoardUtils";
import { TaskBoardPanel } from "@/components/app/panels/TaskBoardPanel";
import type { TaskBoardViewMode } from "@/components/app/types";
import type { TaskCenterTaskReference } from "@/components/app/types/component.types";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { WorkspaceSpecSummary, WorkspaceTaskBoard } from "@shared/appTypes";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import { useEffect, useState } from "react";

export function TaskCenter() {
  const snapshot = useCanonicalAppSnapshot();
  const { taskCenterProps } = useAppMainCenterContent();
  const {
    workspaceTasks,
    workspaceSpecs,
    workspaceTaskBoards,
    updateWorkspaceTaskBoard,
    tools,
    onOpenTask,
    onCreateTask,
    onGenerateTasks,
    onToggleTaskComplete,
    onDeleteTask,
    onSpawnAgentsForTasks,
    generateTasksRequest,
    onClose
  } = taskCenterProps;
  const [viewMode, setViewMode] = useState<TaskBoardViewMode>("list");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<string[]>([]);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [isSpawningAgents, setIsSpawningAgents] = useState(false);
  const detectedTools = tools.filter((tool) => isAgentToolAvailable(tool));

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    const validProjectIds = new Set([
      ...(snapshot.project ? [snapshot.project.id] : []),
      ...snapshot.workspaces.map((workspace) => workspace.project.id)
    ]);

    setSelectedWorkspaceId((current) => {
      if (current && validProjectIds.has(current)) {
        return current;
      }

      return snapshot.project?.id || snapshot.workspaces[0]?.project.id || null;
    });
  }, [snapshot]);

  useEffect(() => {
    setSelectedToolId((current) => current || detectedTools[0]?.id || "");
  }, [detectedTools]);

  useEffect(() => {
    if (!generateTasksRequest) {
      return;
    }

    setSelectedWorkspaceId(generateTasksRequest.projectId);
  }, [generateTasksRequest]);

  const workspaceEntries = !snapshot
    ? []
    : [
    ...(snapshot.project
      ? [{
          projectId: snapshot.project.id,
          projectName: snapshot.project.name,
          projectRootPath: snapshot.project.rootPath
        }]
      : []),
    ...snapshot.workspaces
      .filter((workspace) => workspace.project.id !== snapshot.project?.id)
      .map((workspace) => ({
        projectId: workspace.project.id,
        projectName: workspace.project.name,
        projectRootPath: workspace.project.rootPath
      }))
  ].map((workspace) => ({
    ...workspace,
    tasks: workspaceTasks[workspace.projectId]?.tasks ?? [],
    specs: workspaceSpecs[workspace.projectId]?.specs ?? [] as WorkspaceSpecSummary[],
    board: workspaceTaskBoards[workspace.projectId]?.board ?? createDefaultWorkspaceTaskBoard(),
    isTasksLoading: workspaceTasks[workspace.projectId]?.isLoading ?? false,
    tasksErrorMessage: workspaceTasks[workspace.projectId]?.errorMessage ?? null,
    isBoardLoading: workspaceTaskBoards[workspace.projectId]?.isLoading ?? false,
    boardErrorMessage: workspaceTaskBoards[workspace.projectId]?.errorMessage ?? null
  }));

  const allOpenTaskReferences = workspaceEntries.flatMap((workspace) =>
    workspace.tasks
      .filter((task) => !task.completed)
      .map((task) => ({
        projectId: workspace.projectId,
        projectName: workspace.projectName,
        projectRootPath: workspace.projectRootPath,
        path: task.path,
        title: task.title
      } satisfies TaskCenterTaskReference))
  );

  useEffect(() => {
    const validKeys = new Set(allOpenTaskReferences.map((task) => `${task.projectId}:${task.path}`));
    setSelectedTaskKeys((current) => current.filter((key) => validKeys.has(key)));
  }, [allOpenTaskReferences.map((task) => `${task.projectId}:${task.path}`).join("\n")]);

  const updateWorkspaceBoard = async (
    projectId: string,
    updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard
  ): Promise<void> => {
    try {
      await updateWorkspaceTaskBoard(projectId, updater);
    } catch {
      // The hook stores the error state for the affected workspace board.
    }
  };

  const selectedTasks = selectedTaskKeys
    .map((key) => allOpenTaskReferences.find((task) => `${task.projectId}:${task.path}` === key) || null)
    .filter((task): task is TaskCenterTaskReference => task !== null);

  if (!snapshot) {
    return null;
  }

  return (
    <TaskBoardPanel
      workspaces={workspaceEntries}
      availableTools={detectedTools}
      activeWorkspaceId={selectedWorkspaceId}
      viewMode={viewMode}
      selectedTaskKeys={selectedTaskKeys}
      selectedToolId={selectedToolId}
      isSpawningAgents={isSpawningAgents}
      onViewModeChange={setViewMode}
      onSelectWorkspace={setSelectedWorkspaceId}
      onToggleTaskSelection={(projectId, taskPath) =>
        setSelectedTaskKeys((current) => {
          const key = `${projectId}:${taskPath}`;
          return current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key];
        })
      }
      onClearTaskSelection={() => setSelectedTaskKeys([])}
      onSelectedToolChange={setSelectedToolId}
      onSpawnSelectedAgents={async () => {
        if (!selectedToolId || !selectedTasks.length || isSpawningAgents) {
          return;
        }
        setIsSpawningAgents(true);
        try {
          await onSpawnAgentsForTasks(selectedToolId, selectedTasks);
          setSelectedTaskKeys([]);
        } finally {
          setIsSpawningAgents(false);
        }
      }}
      onOpenTask={onOpenTask}
      onCreateTask={onCreateTask}
      onGenerateTasks={onGenerateTasks}
      onToggleTaskComplete={onToggleTaskComplete}
      onDeleteTask={onDeleteTask}
      generateTasksRequest={generateTasksRequest}
      onMoveTask={(projectId, taskPath, sectionId) =>
        updateWorkspaceBoard(projectId, (currentBoard) => moveTaskToBoardSection(currentBoard, taskPath, sectionId))
      }
      onCreateSection={(projectId, title) =>
        updateWorkspaceBoard(projectId, (currentBoard) => createTaskBoardSection(currentBoard, title))
      }
      onRenameSection={(projectId, sectionId, title) =>
        updateWorkspaceBoard(projectId, (currentBoard) => renameTaskBoardSection(currentBoard, sectionId, title))
      }
      onDeleteSection={(projectId, sectionId) =>
        updateWorkspaceBoard(projectId, (currentBoard) => deleteTaskBoardSection(currentBoard, sectionId))
      }
      onClose={onClose}
    />
  );
}
