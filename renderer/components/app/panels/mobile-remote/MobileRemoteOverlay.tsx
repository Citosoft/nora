import { useEffect } from "react";
import { SIDEBAR_MODE_STRIP_WIDTH } from "@/components/app/constants/uiLayout";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { MobileRemoteOverlayProps } from "@/components/app/types/remoteAccess.types";
import { MobileRemotePage } from "./MobileRemotePage";

/** Lays the Mobile page over the sidebar, center and changes column, leaving the mode strip beside it in view. */
export function MobileRemoteOverlay({ edge }: MobileRemoteOverlayProps) {
  const { preferences, route, setPreferences } = useWorkspaceNavigation();
  const activeId = useThreadCenterPorts().state.layout.activeId;
  const mobile = preferences.sidebarMode === "mobile";
  // A thread opened from elsewhere (a toast, a notification, a link) takes over, so the sidebar moves on to Threads with it.
  useEffect(() => {
    if (mobile && activeId) setPreferences((current) => ({ ...current, sidebarMode: "threads" }));
  }, [mobile, activeId, setPreferences]);
  if (!mobile || route || activeId) return null;
  return <div className="absolute inset-y-0 z-30" style={edge === "left" ? { left: SIDEBAR_MODE_STRIP_WIDTH, right: 0 } : { left: 0, right: SIDEBAR_MODE_STRIP_WIDTH }}>
    <MobileRemotePage />
  </div>;
}
