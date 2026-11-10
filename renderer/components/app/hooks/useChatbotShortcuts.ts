import { useOptionalWorkspaceSidebarPorts } from "@/components/app/context/workspaceSidebarPortsContext";
import { CHATBOT_SHORTCUTS } from "@/components/app/logic/chatbotShortcuts";
import { createWorkspaceTerminalNavigation } from "@/components/app/logic/workspaceTerminalNavigation";
import type { ChatbotShortcutsModel } from "@/components/app/types/chatbotShortcuts.types";
import { useMemo } from "react";

/** Returns null outside the signed-in shell (startup screens), where there is no browser to open. */
export const useChatbotShortcuts = (): ChatbotShortcutsModel | null => {
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
