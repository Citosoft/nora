import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { resolveWorkspaceToolRoute } from "@/components/app/logic/workspace-navigation/routes";
import { useThreadTabsPorts } from "@/components/app/hooks/useThreadTabsPorts";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { parseSidebarPreferences, SIDEBAR_PREFERENCES_KEY } from "@/components/app/logic/workspace-navigation/preferences";
import type { WorkspaceNavigationProviderProps, WorkspaceNavigationValue, WorkspaceToolRoute } from "@/components/app/types/workspaceNavigation.types";

export const WorkspaceNavigationContext = createContext<WorkspaceNavigationValue | null>(null);
export function WorkspaceNavigationProvider({ children }: WorkspaceNavigationProviderProps) {
  const snapshot = useCanonicalAppSnapshot();
  const projectId = snapshot?.project?.id ?? null;
  const { state, setThreadVisible } = useThreadNavigationPorts();
  const tabs = useThreadTabsPorts();
  const [route, setRoute] = useState<WorkspaceToolRoute | null>(null);
  const [preferences, updatePreferences] = useState(() => {
    try { return parseSidebarPreferences(localStorage.getItem(SIDEBAR_PREFERENCES_KEY)); }
    catch { return parseSidebarPreferences(null); }
  });
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PREFERENCES_KEY, JSON.stringify(preferences));
      setPreferenceError(null);
    } catch {
      setPreferenceError("Sidebar preferences could not be saved. Your choices are kept for this session.");
    }
  }, [preferences]);
  const setPreferences = updatePreferences;
  const openTool = useCallback<WorkspaceNavigationValue["openTool"]>((projectId, tool) => {
    if (projectId === snapshot?.project?.id) {
      setRoute({ projectId, tool, focusRevision: state.focusRevision });
    }
  }, [state.focusRevision, snapshot?.project?.id]);
  const closeTool = useCallback(() => setRoute(null), []);
  const returnToThread = useCallback(() => {
    setRoute(null);
    if (tabs.activeId) tabs.focus(tabs.activeId);
  }, [tabs.activeId, tabs.focus]);
  // Selecting a thread through any entry point returns to it, including keyboard shortcuts.
  const visibleRoute = resolveWorkspaceToolRoute(route, projectId, state.focusRevision, snapshot?.project);
  useEffect(() => {
    if (route && !visibleRoute) setRoute(null);
  }, [route, visibleRoute]);
  const threadVisible = !visibleRoute;
  useEffect(() => { setThreadVisible(threadVisible); }, [setThreadVisible, threadVisible]);
  const value = useMemo<WorkspaceNavigationValue>(() => ({ route: visibleRoute, openTool, closeTool, returnToThread, preferences, setPreferences, preferenceError }),
    [visibleRoute, openTool, closeTool, returnToThread, preferences, setPreferences, preferenceError]);
  return <WorkspaceNavigationContext.Provider value={value}>{children}</WorkspaceNavigationContext.Provider>;
}
