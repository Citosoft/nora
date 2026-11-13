import { useContext, useMemo, useState } from "react";
import { WorkspaceNavigationContext } from "@/components/app/context/workspaceNavigationContext";
import type { MemberThreadVisibility, MemberThreadVisibilityControl } from "@/components/app/types/thread-workspace/navigation.types";

const DEFAULT_VISIBILITY: MemberThreadVisibility = "visible";

/**
 * The saved choice to list or hide group members' own threads, shared by the sidebar, Bots home and group chats. Hosts without the app's
 * workspace navigation (the chat simulator and UI fixtures) keep the choice for the session instead of failing to render.
 */
export function useMemberThreadVisibility(): MemberThreadVisibilityControl {
  const navigation = useContext(WorkspaceNavigationContext);
  const [local, setLocal] = useState<MemberThreadVisibility>(DEFAULT_VISIBILITY);
  const visibility = navigation?.preferences.memberThreads ?? local;
  const setPreferences = navigation?.setPreferences;
  return useMemo(() => ({ visibility,
    setVisibility: (memberThreads: MemberThreadVisibility) => setPreferences ? setPreferences((current) => ({ ...current, memberThreads })) : setLocal(memberThreads) }),
  [visibility, setPreferences]);
}
