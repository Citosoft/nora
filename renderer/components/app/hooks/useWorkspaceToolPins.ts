import { effectiveRole } from "@shared/personalization/profiles";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { availableWorkspaceTools, defaultWorkspaceToolPins, toggleWorkspaceToolPin, workspaceToolPins } from "@/components/app/logic/workspace-navigation/tools";
import type { WorkspaceToolId, WorkspaceToolPinsState } from "@/components/app/types/workspaceNavigation.types";

/** One source for a workspace's rail pins: saved pins once you've changed any, otherwise the work role's defaults. */
export function useWorkspaceToolPins(projectId: string, git: boolean): WorkspaceToolPinsState {
  const navigation = useWorkspaceNavigation();
  const { boot } = useNativeRuntimePorts();
  // The workspace's own role when it has one, otherwise the app role.
  const nativeWorkspace = boot.workspaces.find((entry) => entry.shellProjectId === projectId);
  const role = nativeWorkspace ? effectiveRole(boot.personalization, nativeWorkspace.id) : boot.personalization.defaultRole;
  const defaults = defaultWorkspaceToolPins(role?.id ?? null);
  const available = availableWorkspaceTools(git);
  return {
    available,
    pins: workspaceToolPins(available, navigation.preferences.toolPins[projectId], defaults),
    togglePin: (tool: WorkspaceToolId) => navigation.setPreferences((current) => ({
      ...current,
      toolPins: { ...current.toolPins, [projectId]: toggleWorkspaceToolPin(current.toolPins[projectId] ?? defaults, tool) }
    }))
  };
}
