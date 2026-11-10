import { createContext, useCallback, useMemo, useState } from "react";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { parseSidebarPreferences, SIDEBAR_PREFERENCES_KEY } from "@/components/app/logic/workspace-navigation/preferences";
import type { WorkspaceNavigationProviderProps, WorkspaceNavigationValue, WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";

export const WorkspaceNavigationContext = createContext<WorkspaceNavigationValue | null>(null);
export function WorkspaceNavigationProvider({ children }: WorkspaceNavigationProviderProps) {
  const { state } = useThreadNavigationPorts();
  const [route, setRoute] = useState<WorkspaceToolRoute | null>(null);
  const [preferences, updatePreferences] = useState(() => {
    try { return parseSidebarPreferences(localStorage.getItem(SIDEBAR_PREFERENCES_KEY)); }
    catch { return parseSidebarPreferences(null); }
  });
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const setPreferences = useCallback<WorkspaceNavigationValue["setPreferences"]>((updater) => {
    updatePreferences((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      try { localStorage.setItem(SIDEBAR_PREFERENCES_KEY, JSON.stringify(next)); setPreferenceError(null); }
      catch { setPreferenceError("Sidebar preferences could not be saved. Your choices are kept for this session."); }
      return next;
    });
  }, []);
  const openTool = useCallback<WorkspaceNavigationValue["openTool"]>((projectId, tool) => {
    setRoute({ projectId, tool, focusRevision: state.focusRevision });
  }, [state.focusRevision]);
  const closeTool = useCallback(() => setRoute(null), []);
  // Selecting a thread through any entry point returns to it, including keyboard shortcuts.
  const visibleRoute = route?.focusRevision === state.focusRevision ? route : null;
  const value = useMemo<WorkspaceNavigationValue>(() => ({ route: visibleRoute, openTool, closeTool, preferences, setPreferences, preferenceError }),
    [visibleRoute, openTool, closeTool, preferences, setPreferences, preferenceError]);
  return <WorkspaceNavigationContext.Provider value={value}>{children}</WorkspaceNavigationContext.Provider>;
}
