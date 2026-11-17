import { useContext, useMemo, useState } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import type { WorkThreadVisibility, WorkThreadVisibilityControl } from "@/components/app/types/thread-workspace/navigation.types";

const DEFAULT_VISIBILITY: WorkThreadVisibility = "visible";

/**
 * The saved choice to list or hide bots' work threads (behind group and direct chats), shared by the sidebar, Bots home and chats. Hosts without the app's
 * workspace navigation (the chat simulator and UI fixtures) keep the choice for the session instead of failing to render.
 */
export function useWorkThreadVisibility(): WorkThreadVisibilityControl {
  const navigation = useContext(WorkspaceNavigationContext);
  const [local, setLocal] = useState<WorkThreadVisibility>(DEFAULT_VISIBILITY);
  const visibility = navigation?.preferences.workThreads ?? local;
  const setPreferences = navigation?.setPreferences;
  return useMemo(() => ({ visibility,
    setVisibility: (workThreads: WorkThreadVisibility) => setPreferences ? setPreferences((current) => ({ ...current, workThreads })) : setLocal(workThreads) }),
  [visibility, setPreferences]);
}
