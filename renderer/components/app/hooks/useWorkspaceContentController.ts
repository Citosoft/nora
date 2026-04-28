import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { formatTaskFileInstruction } from "@/components/app/logic/appUtils";
import { launchAgent, launchAgentWithInstruction } from "@/components/app/logic/launchAgentWithInstruction";
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
  updateWorkspaceTaskBoard,
  setWorkspaceTasks,
  setWorkspaceSpecs,
  setWorkspaceNotes,
  reloadWorkspaceTasksForProject,
  reloadWorkspaceSpecsForProject,
  reloadWorkspaceNotesForProject,
  setFileEditorState,
  fileEditorState,
  openFileEditor,
  safelyAndRefresh,
  updateSnapshotState,
  captureError,
  focusWorkspaceWithRecovery,
  runWithStatus,
  statusBar,
  setIsCenterDiffExpanded,
  trackAgentCreation
}: UseWorkspaceContentControllerArgs): UseWorkspaceContentControllerResult {
  const snapshot = useCanonicalAppSnapshot();
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
      return "Workspace";
    }
    if (snapshot.project?.id === projectId) {
      return snapshot.project.name;
    }

    return snapshot.workspaces.find((workspace) => workspace.project.id === projectId)?.project.name ?? "Workspace";
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

  const recordTaskAssignment = async (
    projectId: string,
    taskPath: string,
    assignment: {
      agentId: string;
      sessionId: string;
      agentName: string;
      toolId: string;
      toolLabel: string;
    }
  ): Promise<void> => {
    await updateWorkspaceTaskBoard(projectId, (currentBoard) => {
      const existingAssignments = currentBoard.taskAssignments[taskPath] ?? [];
      const nextAssignment = {
        ...assignment,
        assignedAt: new Date().toISOString()
      };

      return {
        ...currentBoard,
        taskAssignments: {
          ...currentBoard.taskAssignments,
          [taskPath]: [...existingAssignments, nextAssignment]
        }
      };
    });
  };

  const focusCreatedAgent = async (agentId: string): Promise<void> => {
    await safelyAndRefresh(() => noraAgentClient.focusAgent(agentId));
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

  const handleSpawnTaskAgent = async (toolId: string): Promise<void> => {
    if (!taskEditorState) {
      return;
    }

    const activeTaskEditor = taskEditorState;
    const absoluteTaskPath = await resolveWorkspaceStatePath(activeTaskEditor.projectId, activeTaskEditor.path);
    const instruction = formatTaskFileInstruction(absoluteTaskPath);
    const payload: CreateAgentPayload = {
      toolId,
      name: activeTaskEditor.title,
      task: `Open task file ${absoluteTaskPath}`,
      commandOverride: "",
      mode: "write",
      target: { kind: "new" }
    };
    try {
      const launchResult = await launchAgentWithInstruction({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
        instruction,
        handoffStatusMessage: "Sending task details",
        statusBar,
        updateSnapshot: updateSnapshotState,
        focusAgent: focusCreatedAgent,
        trackCreation: (agentPayload) => {
          trackAgentCreation(agentPayload, "task-panel");
        },
        onCreated: async () => {
          setTaskEditorState(null);
        }
      });
      if (!launchResult) {
        return;
      }

      await recordTaskAssignment(activeTaskEditor.projectId, activeTaskEditor.path, {
        agentId: launchResult.agentId,
        sessionId: launchResult.createdAgent?.sessionId ?? "",
        agentName: launchResult.createdAgent?.name ?? activeTaskEditor.title,
        toolId: launchResult.createdAgent?.toolId ?? toolId,
        toolLabel: launchResult.createdAgent?.toolLabel ?? toolId
      });
    } catch (error: unknown) {
      captureError(error);
    }
  };

  const createAgentForTaskReference = async (toolId: string, task: TaskCenterTaskReference): Promise<void> => {
    const nextWorkspaceState =
      snapshot?.project?.id === task.projectId
        ? snapshot
        : await focusWorkspaceWithRecovery(task.projectId);
    if (!nextWorkspaceState) {
      return;
    }

    const absoluteTaskPath = await resolveWorkspaceStatePath(task.projectId, task.path);
    const instruction = formatTaskFileInstruction(absoluteTaskPath);
    const payload: CreateAgentPayload = {
      toolId,
      name: task.title,
      task: `Open task file ${absoluteTaskPath}`,
      commandOverride: "",
      mode: "write",
      target: { kind: "new" }
    };
    const launchResult = await launchAgentWithInstruction({
      payload,
      createAgent: noraAgentClient.createAgent,
      instruction,
      handoffStatusMessage: "Sending task details",
      statusBar,
      updateSnapshot: updateSnapshotState,
      focusAgent: focusCreatedAgent,
      trackCreation: (agentPayload) => {
        trackAgentCreation(agentPayload, "task-reference");
      },
      onCreated: async ({ snapshot: nextSnapshot }) => {
        updateSnapshotState(nextSnapshot);
      }
    });
    if (!launchResult) {
      throw new Error(`Unable to determine the created agent for ${task.title}.`);
    }

    await recordTaskAssignment(task.projectId, task.path, {
      agentId: launchResult.agentId,
      sessionId: launchResult.createdAgent?.sessionId ?? "",
      agentName: launchResult.createdAgent?.name ?? task.title,
      toolId: launchResult.createdAgent?.toolId ?? toolId,
      toolLabel: launchResult.createdAgent?.toolLabel ?? toolId
    });
  };

  const handleSpawnAgentsForTasks = async (toolId: string, tasks: TaskCenterTaskReference[]): Promise<void> => {
    if (!tasks.length) {
      return;
    }

    const statusId = statusBar.beginStatus(`Creating ${tasks.length} task agents`, true);
    try {
      for (const task of tasks) {
        await createAgentForTaskReference(toolId, task);
      }
      setTaskEditorState(null);
      setIsTaskBoardOpen(false);
      setIsSpecBrowserOpen(false);
      setIsNoteBrowserOpen(false);
    } catch (error: unknown) {
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  };

  const generateWorkspaceTasksWithAgent = async (
    projectId: string,
    toolId: string,
    brief: string | null,
    specPath: string | null
  ): Promise<void> => {
    const nextWorkspaceState =
      snapshot?.project?.id === projectId
        ? snapshot
        : await focusWorkspaceWithRecovery(projectId);
    if (!nextWorkspaceState?.project || nextWorkspaceState.project.id !== projectId) {
      return;
    }

    const projectName = nextWorkspaceState.project.name;
    const projectRootPath = nextWorkspaceState.project.rootPath;
    const instruction = createTaskPlanningInstruction({
      projectName,
      projectRootPath,
      brief,
      specPath
    });

    const payload: CreateAgentPayload = {
      toolId,
      name: `${projectName} planner`,
      task: `Plan and create workspace tasks for ${projectName}`,
      commandOverride: "",
      mode: "write",
      target: { kind: "root" }
    };
    try {
      await launchAgentWithInstruction({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating planning agent", () => noraAgentClient.createAgent(agentPayload)),
        instruction,
        handoffStatusMessage: "Sending planning brief",
        statusBar,
        updateSnapshot: updateSnapshotState,
        focusAgent: focusCreatedAgent,
        trackCreation: (agentPayload) => {
          trackAgentCreation(agentPayload, "task-planner");
        },
        onCreated: async () => {
          setTaskEditorState(null);
          setIsTaskBoardOpen(false);
          setIsSpecBrowserOpen(false);
          setIsNoteBrowserOpen(false);
        }
      });
    } catch (error: unknown) {
      captureError(error);
    }
  };

  const handleCreateAgentFromDialog = async (payload: CreateAgentPayload, taskPath: string | null): Promise<void> => {
    try {
      const launchResult = taskPath && snapshot?.project
        ? await launchAgentWithInstruction({
          payload,
          createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
          instruction: formatTaskFileInstruction(await resolveWorkspaceStatePath(snapshot.project.id, taskPath)),
          handoffStatusMessage: "Sending task details",
          statusBar,
          updateSnapshot: updateSnapshotState,
          focusAgent: focusCreatedAgent,
          trackCreation: (agentPayload) => {
            trackAgentCreation(agentPayload, "dialog");
          }
        })
        : await launchAgent({
        payload,
        createAgent: (agentPayload) => runWithStatus("Creating agent", () => noraAgentClient.createAgent(agentPayload)),
        trackCreation: (agentPayload) => {
          trackAgentCreation(agentPayload, "dialog");
        }
      });
      if (!launchResult) {
        return;
      }

      if (!taskPath || !snapshot?.project) {
        return;
      }

      await recordTaskAssignment(snapshot.project.id, taskPath, {
        agentId: launchResult.agentId,
        sessionId: launchResult.createdAgent?.sessionId ?? "",
        agentName: launchResult.createdAgent?.name ?? (payload.name || "Agent"),
        toolId: launchResult.createdAgent?.toolId ?? payload.toolId,
        toolLabel: launchResult.createdAgent?.toolLabel ?? payload.toolId
      });
    } catch (error: unknown) {
      captureError(error);
    }
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
    handleSpawnTaskAgent,
    handleSpawnAgentsForTasks,
    generateWorkspaceTasksWithAgent,
    handleCreateAgentFromDialog
  };
}
