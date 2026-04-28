import { useAppRootShellState } from "@/components/app/context/appRootShellStateContext";
import { useAppRootState } from "@/components/app/context/appRootStateContext";
import { useAppRootDialogsState } from "@/components/app/hooks/useAppRootDialogsState";
import type {
  AppRootDialogsContextValue,
  AppRootDialogsProviderProps
} from "@/components/app/types/appRootDialogsContext.types";
import { createContext, useContext, useMemo, useState, type ReactElement } from "react";

const AppRootDialogsContext = createContext<AppRootDialogsContextValue | null>(null);

export function AppRootDialogsProvider({
  appSettings,
  updateAnalyticsConsentStatus,
  updateLinuxAptSetupPromptDismissed,
  updateBrowserPreferences,
  captureError,
  flashStatus,
  statusBar,
  children
}: AppRootDialogsProviderProps): ReactElement {
  const { uiState, setUiState } = useAppRootState();
  const { activeView } = useAppRootShellState();
  const [isCreatePullRequestDialogOpen, setIsCreatePullRequestDialogOpen] = useState(false);
  const dialogsState = useAppRootDialogsState({
    setUiState,
    appSettings,
    captureError,
    activeView,
    focusedBrowserTabId: uiState.focusedBrowserTabId,
    updateAnalyticsConsentStatus,
    updateLinuxAptSetupPromptDismissed,
    updateBrowserPreferences,
    flashStatus,
    statusBar
  });

  const value = useMemo<AppRootDialogsContextValue>(() => ({
    ...dialogsState,
    isCreatePullRequestDialogOpen,
    setIsCreatePullRequestDialogOpen
  }), [dialogsState, isCreatePullRequestDialogOpen]);

  return <AppRootDialogsContext.Provider value={value}>{children}</AppRootDialogsContext.Provider>;
}

export function useAppRootDialogs(): AppRootDialogsContextValue {
  const value = useContext(AppRootDialogsContext);
  if (!value) {
    throw new Error("useAppRootDialogs must be used within AppRootDialogsProvider.");
  }

  return value;
}
