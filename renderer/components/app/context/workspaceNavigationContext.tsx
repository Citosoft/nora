import { createContext, useEffect, useMemo, useState } from "react";
import { useWorkspaceToolNavigation } from "@/components/app/hooks/useWorkspaceToolNavigation";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { parseSidebarPreferences, SIDEBAR_PREFERENCES_KEY } from "@/components/app/logic/workspace-navigation/preferences";
import type { WorkspaceNavigationProviderProps, WorkspaceNavigationValue } from "@/components/app/types/workspaceNavigation.types";

export const WorkspaceNavigationContext = createContext<WorkspaceNavigationValue | null>(null);
export function WorkspaceNavigationProvider({ children }: WorkspaceNavigationProviderProps) {
  const { setThreadVisible } = useThreadNavigationPorts();
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
  const { route, openedTools, openTool, closeTool, returnToThread } = useWorkspaceToolNavigation({ preferences, setPreferences });
  const threadVisible = !route;
  useEffect(() => { setThreadVisible(threadVisible); }, [setThreadVisible, threadVisible]);
  const value = useMemo<WorkspaceNavigationValue>(() => ({ route, openedTools, openTool, closeTool, returnToThread, preferences, setPreferences, preferenceError }),
    [route, openedTools, openTool, closeTool, returnToThread, preferences, setPreferences, preferenceError]);
  return <WorkspaceNavigationContext.Provider value={value}>{children}</WorkspaceNavigationContext.Provider>;
}
