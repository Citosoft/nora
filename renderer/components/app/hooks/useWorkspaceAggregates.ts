import type {
  WorkspaceNotesState,
  WorkspaceSpecsState,
  WorkspaceTasksState
} from "@/components/app/types";
import type { WorkspaceQuickSearchSource } from "@/components/app/types/titlebarWorkspaceSearch.types";
import type { WorkspaceNoteSummary, WorkspaceSpecSummary, WorkspaceTaskSummary } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useMemo } from "react";

export type WorkspaceItemAggregate = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
};

export function useWorkspaceAggregates({
  workspaceTasks,
  workspaceSpecs,
  workspaceNotes,
  workspaceFilePaths
}: {
  workspaceTasks: WorkspaceTasksState;
  workspaceSpecs: WorkspaceSpecsState;
  workspaceNotes: WorkspaceNotesState;
  workspaceFilePaths: string[];
}): {
  allWorkspaceTasks: Array<WorkspaceItemAggregate & WorkspaceTaskSummary>;
  allWorkspaceSpecs: Array<WorkspaceItemAggregate & WorkspaceSpecSummary>;
  allWorkspaceNotes: Array<WorkspaceItemAggregate & WorkspaceNoteSummary>;
  workspaceQuickSearchSource: WorkspaceQuickSearchSource;
} {
  const snapshot = useCanonicalAppSnapshot();
  const currentProject = snapshot?.project ?? null;
  const currentWorkspaces = snapshot?.workspaces ?? [];

  const allWorkspaceTasks = useMemo(() => [
    ...(currentProject ? [{
      projectId: currentProject.id,
      projectName: currentProject.name,
      projectRootPath: currentProject.rootPath,
      tasks: workspaceTasks[currentProject.id]?.tasks ?? []
    }] : []),
    ...currentWorkspaces
      .filter((workspace) => workspace.project.id !== currentProject?.id)
      .map((workspace) => ({
        projectId: workspace.project.id,
        projectName: workspace.project.name,
        projectRootPath: workspace.project.rootPath,
        tasks: workspaceTasks[workspace.project.id]?.tasks ?? []
      }))
  ].flatMap((entry) =>
    entry.tasks.map((task) => ({
      ...task,
      projectId: entry.projectId,
      projectName: entry.projectName,
      projectRootPath: entry.projectRootPath
    }))
  ).sort((left, right) => {
    const projectDelta = left.projectName.localeCompare(right.projectName);
    return projectDelta !== 0 ? projectDelta : left.title.localeCompare(right.title);
  }), [currentProject, currentWorkspaces, workspaceTasks]);

  const allWorkspaceSpecs = useMemo(() => [
    ...(currentProject ? [{
      projectId: currentProject.id,
      projectName: currentProject.name,
      projectRootPath: currentProject.rootPath,
      specs: workspaceSpecs[currentProject.id]?.specs ?? []
    }] : []),
    ...currentWorkspaces
      .filter((workspace) => workspace.project.id !== currentProject?.id)
      .map((workspace) => ({
        projectId: workspace.project.id,
        projectName: workspace.project.name,
        projectRootPath: workspace.project.rootPath,
        specs: workspaceSpecs[workspace.project.id]?.specs ?? []
      }))
  ].flatMap((entry) =>
    entry.specs.map((spec) => ({
      ...spec,
      projectId: entry.projectId,
      projectName: entry.projectName,
      projectRootPath: entry.projectRootPath
    }))
  ).sort((left, right) => {
    const projectDelta = left.projectName.localeCompare(right.projectName);
    return projectDelta !== 0 ? projectDelta : left.title.localeCompare(right.title);
  }), [currentProject, currentWorkspaces, workspaceSpecs]);

  const allWorkspaceNotes = useMemo(() => [
    ...(currentProject ? [{
      projectId: currentProject.id,
      projectName: currentProject.name,
      projectRootPath: currentProject.rootPath,
      notes: workspaceNotes[currentProject.id]?.notes ?? []
    }] : []),
    ...currentWorkspaces
      .filter((workspace) => workspace.project.id !== currentProject?.id)
      .map((workspace) => ({
        projectId: workspace.project.id,
        projectName: workspace.project.name,
        projectRootPath: workspace.project.rootPath,
        notes: workspaceNotes[workspace.project.id]?.notes ?? []
      }))
  ].flatMap((entry) =>
    entry.notes.map((note) => ({
      ...note,
      projectId: entry.projectId,
      projectName: entry.projectName,
      projectRootPath: entry.projectRootPath
    }))
  ).sort((left, right) => {
    const projectDelta = left.projectName.localeCompare(right.projectName);
    return projectDelta !== 0 ? projectDelta : left.title.localeCompare(right.title);
  }), [currentProject, currentWorkspaces, workspaceNotes]);

  const worktreePaths = useMemo(() => new Map(snapshot?.worktrees.map((worktree) => [worktree.id, worktree.path])), [snapshot?.worktrees]);
  const workspaceQuickSearchSource = useMemo((): WorkspaceQuickSearchSource => ({
    agents: (snapshot?.agents ?? []).map((agent) => {
      return {
        id: agent.id,
        name: agent.name,
        task: agent.task,
        toolLabel: agent.toolLabel,
        workspace: agent.workspace,
        projectId: agent.projectId,
        branch: agent.branch,
        worktreePath: agent.worktreeId ? worktreePaths.get(agent.worktreeId) ?? null : null
      };
    }),
    terminals: (snapshot?.terminals ?? []).map((terminal) => {
      return {
        id: terminal.id,
        name: terminal.name,
        workspace: terminal.workspace,
        projectId: terminal.projectId,
        branch: terminal.branch,
        worktreePath: terminal.worktreeId ? worktreePaths.get(terminal.worktreeId) ?? null : null
      };
    }),
    tasks: allWorkspaceTasks,
    specs: allWorkspaceSpecs,
    notes: allWorkspaceNotes,
    filePaths: workspaceFilePaths
  }), [
    allWorkspaceNotes,
    allWorkspaceSpecs,
    allWorkspaceTasks,
    snapshot?.agents,
    snapshot?.terminals,
    worktreePaths,
    workspaceFilePaths
  ]);

  return {
    allWorkspaceTasks,
    allWorkspaceSpecs,
    allWorkspaceNotes,
    workspaceQuickSearchSource
  };
}
