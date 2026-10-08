import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import { CHATBOT_SHORTCUTS } from "@/components/app/logic/chatbotShortcuts";
import { createWorkspaceTerminalNavigation } from "@/components/app/logic/workspaceTerminalNavigation";
import type { StatusBarChatbotsModel } from "@/components/app/types/statusBarChatbots.types";
import { useMemo } from "react";

/** Returns null outside the signed-in shell (loading / onboarding footers), where there is no browser to open. */
export const useStatusBarChatbots = (): StatusBarChatbotsModel | null => {
  const sidebarBuild = useOptionalWorkspaceSidebarPorts()?.sidebarBuild ?? null;

  return useMemo(() => {
    if (!sidebarBuild) {
      return null;
    }
    const { activeProjectId } = sidebarBuild;
    const navigation = createWorkspaceTerminalNavigation(sidebarBuild);
    return {
      shortcuts: CHATBOT_SHORTCUTS,
      canOpen: activeProjectId !== null,
      openShortcut: (shortcut) => {
        if (activeProjectId) {
          navigation.openWorkspaceBrowser(activeProjectId, shortcut.url);
        }
      }
    };
  }, [sidebarBuild]);
};
