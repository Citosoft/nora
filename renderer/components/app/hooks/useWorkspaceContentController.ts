import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { formatTaskFileInstruction } from "@/components/app/logic/appUtils";
import { createNoteDraft } from "@/components/app/logic/noteUtils";
import { createSpecDraft } from "@/components/app/logic/specUtils";
import { getTaskAssignments, getTaskBoardSectionTitle } from "@/components/app/logic/taskBoardUtils";
import { createDuplicatedTaskContent, createTaskDraft, createTaskPlanningInstruction, deriveTaskTitle } from "@/components/app/logic/taskUtils";
import type { TaskEditorState } from "@/components/app/types";
import type { UseWorkspaceContentControllerArgs, UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type { TaskCenterTaskReference } from "@/components/app/types/component.types";
import type { CreateAgentPayload } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useEffect, useState } from "react";

export function useWorkspaceContentController({
  workspaceTasks,
  workspaceSpecs,
  workspaceNotes,
  workspaceTaskBoards,
  setWorkspaceTasks,
  setWorkspaceSpecs,
  setWorkspaceNotes,
  reloadWorkspaceTasksForProject,
  reloadWorkspaceSpecsForProject,
  reloadWorkspaceNotesForProject,
  setFileEditorState,
  fileEditorState,
  openFileEditor,
  updateSnapshotState,
  captureError,
  focusWorkspaceWithRecovery,
  statusBar,
  setIsCenterDiffExpanded,
}: UseWorkspaceContentControllerArgs): UseWorkspaceContentControllerResult {
  const snapshot = useCanonicalAppSnapshot();
  const native = useNativeRuntimePorts();
  const [taskEditorState, setTaskEditorState] = useState<TaskEditorState | null>(null);
  const [isCreatingSpec, setIsCreatingSpec] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isTaskBoardOpen, setIsTaskBoardOpen] = useState(false);
  const [isSpecBrowserOpen, setIsSpecBrowserOpen] = useState(false);
  const [isNoteBrowserOpen, setIsNoteBrowserOpen] = useState(false);
  const [generateTasksRequest, setGenerateTasksRequest] = useState<{ projectId: string; specPath: string; nonce: number } | null>(null);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const validProjectIds = new Set([
      ...(snapshot.project ? [snapshot.project.id] : []),
      ...(snapshot.workspaces.map((workspace) => workspace.project.id) ?? [])
    ]);

    setTaskEditorState((current) => {
      if (!current) {
        return current;
      }

      return validProjectIds.has(current.projectId) ? current : null;
    });
  }, [snapshot?.project?.id, snapshot?.workspaces.map((workspace) => workspace.project.id).join("\n")]);

  const resolveProjectRootPath = (projectId: string): string | null => {
    if (!snapshot) {
      return null;
    }
    if (snapshot.project?.id === projectId) {
      return snapshot.project.rootPath;
    }

    return snapshot.workspaces.find((workspace) => workspace.project.id === projectId)?.project.rootPath ?? null;
  };

  const resolveProjectName = (projectId: string): string => {
    if (!snapshot) {
      return "Project";
    }
    if (snapshot.project?.id === projectId) {
      return snapshot.project.name;
    }

    return snapshot.workspaces.find((workspace) => workspace.project.id === projectId)?.project.name ?? "Project";
  };

  const resolveWorkspaceStatePath = async (projectId: string, relativePath: string): Promise<string> =>
    noraWorkspaceClient.resolveWorkspaceStatePath({
      projectId,
      path: relativePath
    });

  const buildTaskAssignedAgents = (projectId: string, taskPath: string) => {
    const board = workspaceTaskBoards[projectId]?.board;
    const assignments = board ? getTaskAssignments(taskPath, board) : [];
    const activeAgentIds = new Set(snapshot?.agents.map((agent) => agent.id) ?? []);

    return assignments.map((assignment) => ({
      agentId: assignment.agentId,
      agentName: assignment.agentName,
      toolLabel: assignment.toolLabel,
      assignedAt: assignment.assignedAt,
      isActive: activeAgentIds.has(assignment.agentId)
    }));
  };

  const appendTaskContext = (content: string, contextText?: string): string => {
    const normalizedContext = contextText?.trim();
    if (!normalizedContext) {
      return content;
    }

    return [
      content,
      "",
      "## Browser context",
      "",
      "```text",
      normalizedContext,
      "```"
    ].join("\n");
  };

  const appendSpecContext = (content: string, contextText?: string): string => {
    const normalizedContext = contextText?.trim();
    if (!normalizedContext) {
      return content;
    }

    return [
      content,
      "",
      "## Browser context",
      "",
      "```text",
      normalizedContext,
      "```"
    ].join("\n");
  };

  const openTaskEditor = async (projectId: string, pathName: string): Promise<void> => {
    setTaskEditorState(null);
    setIsCenterDiffExpanded(false);
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    await openWorkspaceSpec(projectId, pathName);
  };

  const createWorkspaceTask = async (
    projectId = snapshot?.project?.id ?? "",
    options?: {
      contextText?: string;
    }
  ): Promise<void> => {
    if (!projectId) {
      return;
    }

    const projectRootPath = resolveProjectRootPath(projectId) ?? "";
    if (!projectRootPath) {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathName = `.nora/tasks/task-${stamp}.md`;
    const title = `Task ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}`;
    const content = appendTaskContext(createTaskDraft(title), options?.contextText);

    setTaskEditorState(null);
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setIsCenterDiffExpanded(false);

    const statusId = statusBar.beginStatus("Creating task", true);
    try {
      const next = await noraWorkspaceClient.writeWorkspaceFile({
        projectId,
        path: pathName,
        content
      });
      updateSnapshotState(next);
      void reloadWorkspaceTasksForProject(projectId);
      await openWorkspaceSpec(projectId, pathName);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const openWorkspaceSpec = async (projectId: string, pathName: string): Promise<void> => {
    // Dismiss task/spec/note centers so the workspace session (file editor) is visible and focused.
    // (openTaskEditor already does this before delegating here; direct calls from browsers did not.)
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setIsCenterDiffExpanded(false);
    setGenerateTasksRequest(null);

    if (snapshot?.project?.id === projectId) {
      await openFileEditor(pathName, {
        selectChange: false,
        rootPath: snapshot.project.rootPath
      });
      return;
    }

    const next = await focusWorkspaceWithRecovery(projectId);
    if (!next?.project) {
      return;
    }

    await openFileEditor(pathName, {
      selectChange: false,
      rootPath: next.project.rootPath
    });
  };

  const openWorkspaceNote = openWorkspaceSpec;

  const createWorkspaceSpec = async (
    projectId = snapshot?.project?.id ?? "",
    options?: {
      contextText?: string;
    }
  ): Promise<void> => {
    if (!projectId || isCreatingSpec) {
      return;
    }

    const projectRootPath = resolveProjectRootPath(projectId) ?? "";
    if (!projectRootPath) {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathName = `.nora/specs/spec-${stamp}.md`;
    const title = `Spec ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}`;
    const content = appendSpecContext(createSpecDraft(title), options?.contextText);

    setTaskEditorState(null);
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setIsCenterDiffExpanded(false);
    setIsCreatingSpec(true);

    const statusId = statusBar.beginStatus("Creating spec", true);
    try {
      const next = await noraWorkspaceClient.writeWorkspaceFile({
        projectId,
        path: pathName,
        content
      });
      updateSnapshotState(next);
      void reloadWorkspaceSpecsForProject(projectId);
      await openWorkspaceSpec(projectId, pathName);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      setIsCreatingSpec(false);
      statusBar.endStatus(statusId);
    }
  };

  const createWorkspaceNote = async (projectId = snapshot?.project?.id ?? ""): Promise<void> => {
    if (!projectId || isCreatingNote) {
      return;
    }

    const projectRootPath = resolveProjectRootPath(projectId) ?? "";
    if (!projectRootPath) {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathName = `.nora/notes/note-${stamp}.md`;
    const title = `Note ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}`;
    const content = createNoteDraft(title);

    setTaskEditorState(null);
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setIsCenterDiffExpanded(false);
    setIsCreatingNote(true);

    const statusId = statusBar.beginStatus("Creating note", true);
    try {
      const next = await noraWorkspaceClient.writeWorkspaceFile({
        projectId,
        path: pathName,
        content
      });
      updateSnapshotState(next);
      void reloadWorkspaceNotesForProject(projectId);
      await openWorkspaceNote(projectId, pathName);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      setIsCreatingNote(false);
      statusBar.endStatus(statusId);
    }
  };

  const duplicateTaskToNew = async (): Promise<void> => {
    if (!taskEditorState) {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathName = `.nora/tasks/task-${stamp}.md`;
    const title = taskEditorState.title.replace(/\s+\(completed\)$/i, "").trim();
    const duplicatedContent = createDuplicatedTaskContent(title, taskEditorState.content);
    const projectId = taskEditorState.projectId;
    const projectRootPath = taskEditorState.projectRootPath;

    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setTaskEditorState({
      projectId,
      projectName: resolveProjectName(projectId),
      projectRootPath,
      title,
      path: pathName,
      completed: false,
      updatedAt: null,
      boardSectionTitle: workspaceTaskBoards[projectId]?.board ? getTaskBoardSectionTitle(pathName, workspaceTaskBoards[projectId].board) : null,
      assignedAgents: buildTaskAssignedAgents(projectId, pathName),
      content: duplicatedContent,
      savedContent: duplicatedContent,
      isCreating: true,
      isLoading: false,
      isSaving: false,
      errorMessage: null
    });

    const statusId = statusBar.beginStatus("Duplicating task", true);
    try {
      const next = await noraWorkspaceClient.writeWorkspaceFile({
        projectId,
        path: pathName,
        content: duplicatedContent
      });
      updateSnapshotState(next);
      setTaskEditorState((current) =>
        current && current.projectId === projectId && current.path === pathName
          ? {
              ...current,
              isCreating: false,
              errorMessage: null
            }
          : current
      );
      void reloadWorkspaceTasksForProject(projectId);
    } catch (error: unknown) {
      setTaskEditorState((current) =>
        current && current.projectId === projectId && current.path === pathName
          ? {
              ...current,
              isCreating: false,
              errorMessage: error instanceof Error ? error.message : "Unable to duplicate task."
            }
          : current
      );
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const saveTaskEditor = async (): Promise<void> => {
    if (!taskEditorState || taskEditorState.isCreating || taskEditorState.isLoading || taskEditorState.isSaving) {
      return;
    }

    setTaskEditorState((current) =>
      current
        ? {
            ...current,
            isCreating: false,
            isSaving: true,
            errorMessage: null
          }
        : current
    );

    try {
      const next = await noraWorkspaceClient.writeWorkspaceFile({
        projectId: taskEditorState.projectId,
        path: taskEditorState.path,
        content: taskEditorState.content
      });
      updateSnapshotState(next);
      const refreshedTitle = deriveTaskTitle(taskEditorState.content, taskEditorState.title);
      setTaskEditorState((current) =>
        current
          ? {
              ...current,
              title: refreshedTitle,
              savedContent: current.content,
              isSaving: false,
              errorMessage: null
            }
          : current
      );
      await reloadWorkspaceTasksForProject(taskEditorState.projectId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save task.";
      setTaskEditorState((current) =>
        current
          ? {
              ...current,
              isSaving: false,
              errorMessage: message
            }
          : current
      );
    }
  };

  const handleToggleTaskComplete = async (projectId: string, fromPath: string, toPath: string): Promise<void> => {
    const statusId = statusBar.beginStatus("Updating task", true);
    try {
      const next = await noraWorkspaceClient.moveWorkspaceFile({
        projectId,
        fromPath,
        toPath
      });
      updateSnapshotState(next);
      setTaskEditorState((current) =>
        current && current.projectId === projectId && current.path === fromPath
          ? {
              ...current,
              path: toPath,
              completed: toPath.startsWith(".nora/tasks/completed/")
            }
          : current
      );
      await reloadWorkspaceTasksForProject(projectId);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const handleDeleteTask = async (projectId: string, pathName: string): Promise<void> => {
    const previousProjectTasks = workspaceTasks[projectId];
    const previousTaskEditor = taskEditorState;

    setWorkspaceTasks((current) => {
      const existing = current[projectId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [projectId]: {
          ...existing,
          tasks: existing.tasks.filter((task) => task.path !== pathName),
          errorMessage: null
        }
      };
    });
    setTaskEditorState((current) =>
      current && current.projectId === projectId && current.path === pathName ? null : current
    );

    const statusId = statusBar.beginStatus("Deleting task", true);
    try {
      const next = await noraWorkspaceClient.deleteWorkspaceFile({
        projectId,
        path: pathName
      });
      updateSnapshotState(next);
      void reloadWorkspaceTasksForProject(projectId);
    } catch (error: unknown) {
      setWorkspaceTasks((current) => ({
        ...current,
        [projectId]: previousProjectTasks ?? {
          tasks: [],
          isLoading: false,
          errorMessage: null
        }
      }));
      if (previousTaskEditor && previousTaskEditor.projectId === projectId && previousTaskEditor.path === pathName) {
        setTaskEditorState(previousTaskEditor);
      }
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const handleDeleteSpec = async (projectId: string, pathName: string): Promise<void> => {
    const previousProjectSpecs = workspaceSpecs[projectId];
    const previousFileEditorState = fileEditorState;

    setWorkspaceSpecs((current) => {
      const existing = current[projectId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [projectId]: {
          ...existing,
          specs: existing.specs.filter((spec) => spec.path !== pathName),
          errorMessage: null
        }
      };
    });
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }

      const nextTabs = current.tabs.filter((tab) => !(tab.projectId === projectId && tab.path === pathName));
      if (!nextTabs.length) {
        return null;
      }

      return {
        activePath:
          current.activePath === pathName
            ? nextTabs[Math.max(0, Math.min(current.tabs.findIndex((tab) => tab.path === pathName), nextTabs.length - 1))].path
            : current.activePath,
        tabs: nextTabs
      };
    });

    const statusId = statusBar.beginStatus("Deleting spec", true);
    try {
      const next = await noraWorkspaceClient.deleteWorkspaceFile({
        projectId,
        path: pathName
      });
      updateSnapshotState(next);
      await reloadWorkspaceSpecsForProject(projectId);
    } catch (error: unknown) {
      setWorkspaceSpecs((current) => ({
        ...current,
        [projectId]: previousProjectSpecs ?? {
          specs: [],
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to delete spec."
        }
      }));
      setFileEditorState(previousFileEditorState);
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const handleDeleteNote = async (projectId: string, pathName: string): Promise<void> => {
    const previousProjectNotes = workspaceNotes[projectId];
    const previousFileEditorState = fileEditorState;

    setWorkspaceNotes((current) => {
      const existing = current[projectId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [projectId]: {
          ...existing,
          notes: existing.notes.filter((note) => note.path !== pathName),
          errorMessage: null
        }
      };
    });
    setFileEditorState((current) => {
      if (!current) {
        return current;
      }

      const nextTabs = current.tabs.filter((tab) => !(tab.projectId === projectId && tab.path === pathName));
      if (!nextTabs.length) {
        return null;
      }

      return {
        activePath:
          current.activePath === pathName
            ? nextTabs[Math.max(0, Math.min(current.tabs.findIndex((tab) => tab.path === pathName), nextTabs.length - 1))].path
            : current.activePath,
        tabs: nextTabs
      };
    });

    const statusId = statusBar.beginStatus("Deleting note", true);
    try {
      const next = await noraWorkspaceClient.deleteWorkspaceFile({
        projectId,
        path: pathName
      });
      updateSnapshotState(next);
      await reloadWorkspaceNotesForProject(projectId);
    } catch (error: unknown) {
      setWorkspaceNotes((current) => ({
        ...current,
        [projectId]: previousProjectNotes ?? {
          notes: [],
          isLoading: false,
          errorMessage: error instanceof Error ? error.message : "Unable to delete note."
        }
      }));
      setFileEditorState(previousFileEditorState);
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const openTaskThread = async (task: TaskCenterTaskReference): Promise<void> => {
    const absolutePath = await resolveWorkspaceStatePath(task.projectId, task.path);
    const id = await native.launch({ projectId: task.projectId, text: formatTaskFileInstruction(absolutePath),
      source: { kind: "task", projectId: task.projectId, path: task.path } });
    if (id) { setTaskEditorState(null); setIsTaskBoardOpen(false); setIsSpecBrowserOpen(false); setIsNoteBrowserOpen(false); }
  };
  const handleStartTaskThread = async (): Promise<void> => {
    if (!taskEditorState) return;
    try { await openTaskThread(taskEditorState); } catch (cause) { captureError(cause); }
  };
  const handleStartTaskThreads = async (tasks: TaskCenterTaskReference[]): Promise<void> => {
    try { for (const task of tasks) await openTaskThread(task); } catch (cause) { captureError(cause); }
  };
  const generateWorkspaceTasks = async (projectId: string, brief: string | null, specPath: string | null): Promise<void> => {
    const project = snapshot?.workspaces.find((entry) => entry.project.id === projectId)?.project ?? (snapshot?.project?.id === projectId ? snapshot.project : null);
    if (!project) throw new Error("Choose an available workspace to plan tasks.");
    const id = await native.launch({ projectId, text: createTaskPlanningInstruction({ projectName: project.name, projectRootPath: project.rootPath, brief, specPath }) });
    if (!id) throw new Error(native.store.snapshot().error ?? "Unable to open a planning thread. Try again.");
    setTaskEditorState(null); setIsTaskBoardOpen(false); setIsSpecBrowserOpen(false); setIsNoteBrowserOpen(false);
  };
  const handleCreateAgentFromDialog = async (payload: CreateAgentPayload, taskPath: string | null): Promise<void> => {
    if (!snapshot?.project) return;
    try { await native.launch({ projectId: snapshot.project.id, text: payload.initialPrompt || payload.task,
      contextSelections: payload.contextSelections,
      ...(taskPath ? { source: { kind: "task", projectId: snapshot.project.id, path: taskPath } as const } : {}) });
    } catch (cause) { captureError(cause); }
  };

  return {
    taskEditorState,
    setTaskEditorState,
    isCreatingSpec,
    isCreatingNote,
    isTaskBoardOpen,
    setIsTaskBoardOpen,
    isSpecBrowserOpen,
    setIsSpecBrowserOpen,
    isNoteBrowserOpen,
    setIsNoteBrowserOpen,
    generateTasksRequest,
    setGenerateTasksRequest,
    openTaskEditor,
    createWorkspaceTask,
    openWorkspaceSpec,
    createWorkspaceSpec,
    openWorkspaceNote,
    createWorkspaceNote,
    duplicateTaskToNew,
    saveTaskEditor,
    handleToggleTaskComplete,
    handleDeleteTask,
    handleDeleteSpec,
    handleDeleteNote,
    handleStartTaskThread,
    handleStartTaskThreads,
    generateWorkspaceTasks,
    handleCreateAgentFromDialog
  };
}
