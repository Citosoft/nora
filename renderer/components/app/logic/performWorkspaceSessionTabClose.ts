import type { WorkspaceSessionTab } from "@/components/app/types/component.types";
import type { WorkspaceSessionTabCloseHandlers } from "@/components/app/types/performWorkspaceSessionTabClose.types";

export const performWorkspaceSessionTabClose = (
  tab: WorkspaceSessionTab,
  handlers: WorkspaceSessionTabCloseHandlers
): void => {
  switch (tab.kind) {
    case "agent":
      handlers.closeAgent(tab.id);
      return;
    case "terminal":
      handlers.closeTerminal(tab.id);
      return;
    case "browser":
      handlers.closeBrowser(tab.id);
      return;
    case "forge":
      handlers.closeForge(tab.id);
      return;
    case "ai-chat":
      handlers.closeAiChat(tab.id);
      return;
    case "view":
      void handlers.deleteSplitView(tab.id);
      return;
    case "file":
      handlers.closeFileEditorAtPath(tab.path);
      return;
    case "diff":
      handlers.closeDiff();
      return;
  }
};
