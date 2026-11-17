import { useCallback } from "react";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { WorkspacePinState } from "@/components/app/types/workspaceNavigation.types";

/** Pin state for one workspace; pinned workspaces sort first in the switcher. */
export function useWorkspacePin(workspaceId: string): WorkspacePinState {
  const { preferences, setPreferences } = useWorkspaceNavigation();
  const pinned = preferences.pinnedWorkspaceIds.includes(workspaceId);
  const togglePinned = useCallback(() => setPreferences((current) => ({
    ...current,
    pinnedWorkspaceIds: current.pinnedWorkspaceIds.includes(workspaceId)
      ? current.pinnedWorkspaceIds.filter((id) => id !== workspaceId)
      : [...current.pinnedWorkspaceIds, workspaceId]
  })), [setPreferences, workspaceId]);
  return { pinned, togglePinned };
}
