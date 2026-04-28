import type { AppView } from "@/components/app/types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";

type AppClosingState = { detail: string; command: string | null } | null;

type AppRootUiState = {
  isCenterDiffExpanded: boolean;
  activeWorkspaceContentTab: "file" | "diff" | null;
  activeView: AppView;
  settingsGroup: SettingsGroup;
  isAddingWorkspace: boolean;
  removingWorkspaceRoots: string[];
  appClosingState: AppClosingState;
  workspaceQuickSearchRequestId: number;
};

function resolveNext<T>(current: T, next: SetStateAction<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}

export function useAppRootUiState(
  initialActiveWorkspaceContentTab: "file" | "diff" | null
): AppRootUiState & {
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setSettingsGroup: Dispatch<SetStateAction<SettingsGroup>>;
  setIsAddingWorkspace: Dispatch<SetStateAction<boolean>>;
  setRemovingWorkspaceRoots: Dispatch<SetStateAction<string[]>>;
  setAppClosingState: Dispatch<SetStateAction<AppClosingState>>;
  setWorkspaceQuickSearchRequestId: Dispatch<SetStateAction<number>>;
} {
  const [state, setState] = useState<AppRootUiState>({
    isCenterDiffExpanded: false,
    activeWorkspaceContentTab: initialActiveWorkspaceContentTab,
    activeView: "main",
    settingsGroup: "appearance",
    isAddingWorkspace: false,
    removingWorkspaceRoots: [],
    appClosingState: null,
    workspaceQuickSearchRequestId: 0
  });

  const setIsCenterDiffExpanded = useCallback<Dispatch<SetStateAction<boolean>>>((next) => {
    setState((current) => ({
      ...current,
      isCenterDiffExpanded: resolveNext(current.isCenterDiffExpanded, next)
    }));
  }, []);

  const setActiveWorkspaceContentTab = useCallback<Dispatch<SetStateAction<"file" | "diff" | null>>>((next) => {
    setState((current) => ({
      ...current,
      activeWorkspaceContentTab: resolveNext(current.activeWorkspaceContentTab, next)
    }));
  }, []);

  const setActiveView = useCallback<Dispatch<SetStateAction<AppView>>>((next) => {
    setState((current) => ({
      ...current,
      activeView: resolveNext(current.activeView, next)
    }));
  }, []);

  const setSettingsGroup = useCallback<Dispatch<SetStateAction<SettingsGroup>>>((next) => {
    setState((current) => ({
      ...current,
      settingsGroup: resolveNext(current.settingsGroup, next)
    }));
  }, []);

  const setIsAddingWorkspace = useCallback<Dispatch<SetStateAction<boolean>>>((next) => {
    setState((current) => ({
      ...current,
      isAddingWorkspace: resolveNext(current.isAddingWorkspace, next)
    }));
  }, []);

  const setRemovingWorkspaceRoots = useCallback<Dispatch<SetStateAction<string[]>>>((next) => {
    setState((current) => ({
      ...current,
      removingWorkspaceRoots: resolveNext(current.removingWorkspaceRoots, next)
    }));
  }, []);

  const setAppClosingState = useCallback<Dispatch<SetStateAction<AppClosingState>>>((next) => {
    setState((current) => ({
      ...current,
      appClosingState: resolveNext(current.appClosingState, next)
    }));
  }, []);

  const setWorkspaceQuickSearchRequestId = useCallback<Dispatch<SetStateAction<number>>>((next) => {
    setState((current) => ({
      ...current,
      workspaceQuickSearchRequestId: resolveNext(current.workspaceQuickSearchRequestId, next)
    }));
  }, []);

  return {
    ...state,
    setIsCenterDiffExpanded,
    setActiveWorkspaceContentTab,
    setActiveView,
    setSettingsGroup,
    setIsAddingWorkspace,
    setRemovingWorkspaceRoots,
    setAppClosingState,
    setWorkspaceQuickSearchRequestId
  };
}
