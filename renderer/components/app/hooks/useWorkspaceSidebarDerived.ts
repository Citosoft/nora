import { useWorkspaceProjectFavicons } from "@/components/app/hooks/useWorkspaceProjectFavicon";
import { areAllWorkspaceGroupsCollapsed, createWorkspaceCollapseMap } from "@/components/app/logic/workspaceCollapseState";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import type { TerminalPreset, TerminalSession, WorkspaceSummary } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useMemo } from "react";

export type UseWorkspaceSidebarDerivedArgs = {
  removingWorkspaceRoots: string[];
  terminalPresets: TerminalPreset[];
  collapsedWorkspaceIds: Record<string, boolean>;
};

export type UseWorkspaceSidebarDerivedResult = {
  removingWorkspaceRootSet: Set<string>;
  preferredShellId: string | null;
  runnableGlobalTerminalPresets: TerminalPreset[];
  workspaceGroups: WorkspaceSummary[];
  projectFaviconUrlByProjectId: Record<string, string | null>;
  activePorts: {
    projectId: string;
    projectRoot: string;
    projectName: string;
    terminal: TerminalSession;
  }[];
  workspaceGroupIds: string[];
  allWorkspaceGroupsCollapsed: boolean;
};

export const useWorkspaceSidebarDerived = ({
  removingWorkspaceRoots,
  terminalPresets,
  collapsedWorkspaceIds
}: UseWorkspaceSidebarDerivedArgs): UseWorkspaceSidebarDerivedResult => {
  const snapshot = useCanonicalAppSnapshot();
  const removingWorkspaceRootSet = useMemo(() => new Set(removingWorkspaceRoots), [removingWorkspaceRoots]);
  const preferredShellId = resolvePreferredTerminalShellId(snapshot?.terminalShells ?? []);
  const runnableGlobalTerminalPresets = useMemo(
    () => terminalPresets.filter((preset) => isRunnableTerminalPreset(preset)),
    [terminalPresets]
  );
  const workspaceGroups = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const currentWorkspaceSummary: WorkspaceSummary | null = snapshot.project
      ? {
          project: snapshot.project,
          sessions: snapshot.sessions,
          worktrees: snapshot.worktrees,
          agents: snapshot.agents,
          terminals: snapshot.terminals
        }
      : null;
    const groups = [
      ...(currentWorkspaceSummary &&
      !snapshot.workspaces.some((workspace) => workspace.project.id === currentWorkspaceSummary.project.id)
        ? [currentWorkspaceSummary]
        : []),
      ...snapshot.workspaces
    ].map((workspace) =>
      currentWorkspaceSummary && workspace.project.id === currentWorkspaceSummary.project.id
        ? currentWorkspaceSummary
        : workspace
    );
    return groups.filter((workspace) => !removingWorkspaceRootSet.has(workspace.project.rootPath));
  }, [removingWorkspaceRootSet, snapshot]);
  const projectFaviconUrlByProjectId = useWorkspaceProjectFavicons(workspaceGroups);
  const activePorts = useMemo(
    () =>
      workspaceGroups
        .flatMap((workspace) =>
          workspace.terminals
            .filter((terminal) => terminal.status === "running" && terminal.detectedLocalPort && terminal.detectedLocalUrl)
            .map((terminal) => ({
              projectId: workspace.project.id,
              projectRoot: workspace.project.rootPath,
              projectName: workspace.project.name,
              terminal
            }))
        )
        .sort((left, right) => {
          const portDelta = (left.terminal.detectedLocalPort || 0) - (right.terminal.detectedLocalPort || 0);
          return portDelta !== 0 ? portDelta : left.projectName.localeCompare(right.projectName);
        }),
    [workspaceGroups]
  );
  const workspaceGroupIds = useMemo(() => workspaceGroups.map((workspace) => workspace.project.id), [workspaceGroups]);
  const allWorkspaceGroupsCollapsed = useMemo(
    () => areAllWorkspaceGroupsCollapsed(workspaceGroupIds, collapsedWorkspaceIds),
    [collapsedWorkspaceIds, workspaceGroupIds]
  );

  return {
    removingWorkspaceRootSet,
    preferredShellId,
    runnableGlobalTerminalPresets,
    workspaceGroups,
    projectFaviconUrlByProjectId,
    activePorts,
    workspaceGroupIds,
    allWorkspaceGroupsCollapsed
  };
};

export const buildWorkspaceCollapseAllMap = (
  workspaceGroupIds: string[],
  nextCollapsedState: boolean
): Record<string, boolean> => createWorkspaceCollapseMap(workspaceGroupIds, nextCollapsedState);
