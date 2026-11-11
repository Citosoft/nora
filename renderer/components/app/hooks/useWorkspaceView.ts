import { useCallback } from "react";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import { defaultWorkspaceView, updateWorkspaceView } from "@/components/app/logic/workspace-navigation/viewState";
import type { WorkspaceViewPreferences } from "@/components/app/types/workspaceView.types";

export function useWorkspaceView(projectId: string) {
  const { preferences, setPreferences } = useWorkspaceNavigation();
  const updateView = useCallback((patch: Partial<WorkspaceViewPreferences>) => {
    setPreferences((current) => updateWorkspaceView(current, projectId, patch));
  }, [projectId, setPreferences]);
  return { view: preferences.workspaceViews[projectId] ?? defaultWorkspaceView, updateView };
}
