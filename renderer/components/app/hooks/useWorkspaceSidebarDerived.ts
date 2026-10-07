import { useWorkspaceProjectFavicons } from "@/components/app/hooks/useWorkspaceProjectFavicons";
import { areAllWorkspaceGroupsCollapsed, createWorkspaceCollapseMap } from "@/components/app/logic/workspaceCollapseState";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import type { TerminalPreset, WorkspaceSummary } from "@shared/appTypes";
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
  const workspaceGroups = useMemo(
    () => buildWorkspaceGroups(snapshot, removingWorkspaceRootSet),
    [removingWorkspaceRootSet, snapshot]
  );
  const projectFaviconUrlByProjectId = useWorkspaceProjectFavicons(workspaceGroups);
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
    workspaceGroupIds,
    allWorkspaceGroupsCollapsed
  };
};

export const buildWorkspaceCollapseAllMap = (
  workspaceGroupIds: string[],
  nextCollapsedState: boolean
): Record<string, boolean> => createWorkspaceCollapseMap(workspaceGroupIds, nextCollapsedState);
