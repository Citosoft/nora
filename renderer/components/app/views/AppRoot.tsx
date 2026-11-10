import { archiveLegacyChatTabs } from "@/components/app/logic/thread-workspace/archiveChats";
import { AppRootShellStateProvider } from "@/components/app/context/appRootShellStateContext";
import { AppRootStateProvider } from "@/components/app/context/appRootStateContext";
import {
  hasStoredUiLayout,
  readStoredAiChatTabsState,
  readStoredBrowserTabsState,
  readStoredForgeViewerTabsState,
  readStoredWorkspaceContentState
} from "@/components/app/logic/appPersistence";
import { appRootInitialUiState } from "@/components/app/logic/appRootInitialState";
import type { UiState } from "@/components/app/types";
import { AppRootRuntime } from "@/components/app/views/AppRootRuntime";
import type { ReactElement } from "react";

export function AppRoot(): ReactElement {
  const hasPersistedUiLayout = hasStoredUiLayout();
  const storedBrowserTabsState = readStoredBrowserTabsState();
  const legacyChatsArchived = archiveLegacyChatTabs(localStorage, new Date().toISOString());
  const storedForgeViewerTabsState = readStoredForgeViewerTabsState();
  const storedWorkspaceContentState = readStoredWorkspaceContentState();
  const shouldApplyFirstLoadCollapsedPanels = !hasPersistedUiLayout;
  const initialUiState: UiState = {
    ...appRootInitialUiState,
    browserTabs: storedBrowserTabsState.tabs,
    focusedBrowserTabId: storedBrowserTabsState.focusedTabId,
    aiChatTabs: [],
    focusedAiChatTabId: null,
    activeErrorMessage: legacyChatsArchived ? null : "Previous chat history could not be archived. Its original storage is preserved. Free storage and restart Nora to retry.",
    forgeViewerTabs: storedForgeViewerTabsState.tabs,
    focusedForgeViewerTabId: storedForgeViewerTabsState.focusedTabId
  };

  return (
    <AppRootStateProvider initialUiState={initialUiState}>
      <AppRootShellStateProvider
        initialActiveWorkspaceContentTab={storedWorkspaceContentState.activeWorkspaceContentTab}
        shouldApplyFirstLoadCollapsedPanels={shouldApplyFirstLoadCollapsedPanels}
      >
        <AppRootRuntime storedWorkspaceContentState={storedWorkspaceContentState} />
      </AppRootShellStateProvider>
    </AppRootStateProvider>
  );
}
