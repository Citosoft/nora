import type { SidebarPreferences } from "@/components/app/types/workspaceNavigation.types";
import type { WorkspaceViewPreferences } from "@/components/app/types/workspaceView.types";

export const defaultWorkspaceView: WorkspaceViewPreferences = {
  activeTool: null, terminalId: null, browserTabId: null, documentPath: null, documentKind: "notes"
};

export function updateWorkspaceView(preferences: SidebarPreferences, projectId: string, patch: Partial<WorkspaceViewPreferences>): SidebarPreferences {
  return { ...preferences, workspaceViews: { ...preferences.workspaceViews,
    [projectId]: { ...(preferences.workspaceViews[projectId] ?? defaultWorkspaceView), ...patch }
  } };
}
