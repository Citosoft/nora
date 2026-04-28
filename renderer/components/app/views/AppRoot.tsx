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
  const storedAiChatTabsState = readStoredAiChatTabsState();
  const storedForgeViewerTabsState = readStoredForgeViewerTabsState();
  const storedWorkspaceContentState = readStoredWorkspaceContentState();
  const shouldApplyFirstLoadCollapsedPanels = !hasPersistedUiLayout;
  const initialUiState: UiState = {
    ...appRootInitialUiState,
    browserTabs: storedBrowserTabsState.tabs,
    focusedBrowserTabId: storedBrowserTabsState.focusedTabId,
    aiChatTabs: storedAiChatTabsState.tabs,
    focusedAiChatTabId: storedAiChatTabsState.focusedTabId,
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
