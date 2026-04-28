import { useAppRootUiState } from "@/components/app/hooks/useAppRootUiState";
import { useAppRootWorkspaceChrome } from "@/components/app/hooks/useAppRootWorkspaceChrome";
import type {
  AppRootShellStateProviderProps,
  AppRootShellStateValue
} from "@/components/app/types/appRootShellStateContext.types";
import { createContext, useContext, useMemo, type ReactElement } from "react";

const AppRootShellStateContext = createContext<AppRootShellStateValue | null>(null);

export function AppRootShellStateProvider({
  initialActiveWorkspaceContentTab,
  shouldApplyFirstLoadCollapsedPanels,
  children
}: AppRootShellStateProviderProps): ReactElement {
  const uiState = useAppRootUiState(initialActiveWorkspaceContentTab);
  const workspaceChrome = useAppRootWorkspaceChrome({
    shouldApplyFirstLoadCollapsedPanels
  });

  const value = useMemo<AppRootShellStateValue>(() => ({
    ...uiState,
    ...workspaceChrome
  }), [uiState, workspaceChrome]);

  const renderedChildren = typeof children === "function" ? children(value) : children;

  return <AppRootShellStateContext.Provider value={value}>{renderedChildren}</AppRootShellStateContext.Provider>;
}

export function useAppRootShellState(): AppRootShellStateValue {
  const value = useContext(AppRootShellStateContext);
  if (!value) {
    throw new Error("useAppRootShellState must be used within AppRootShellStateProvider.");
  }

  return value;
}
