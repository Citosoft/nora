import type { UseAppRootWorkspaceChromeResult } from "@/components/app/types/useAppRootWorkspaceChrome.types";
import type { AppView } from "@/components/app/types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type AppClosingState = { detail: string; command: string | null } | null;

export type AppRootShellStateValue = {
  isCenterDiffExpanded: boolean;
  activeWorkspaceContentTab: "file" | "diff" | null;
  activeView: AppView;
  settingsGroup: SettingsGroup;
  isAddingWorkspace: boolean;
  removingWorkspaceRoots: string[];
  appClosingState: AppClosingState;
  workspaceQuickSearchRequestId: number;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setSettingsGroup: Dispatch<SetStateAction<SettingsGroup>>;
  setIsAddingWorkspace: Dispatch<SetStateAction<boolean>>;
  setRemovingWorkspaceRoots: Dispatch<SetStateAction<string[]>>;
  setAppClosingState: Dispatch<SetStateAction<AppClosingState>>;
  setWorkspaceQuickSearchRequestId: Dispatch<SetStateAction<number>>;
} & UseAppRootWorkspaceChromeResult;

export type AppRootShellStateProviderProps = {
  initialActiveWorkspaceContentTab: "file" | "diff" | null;
  shouldApplyFirstLoadCollapsedPanels: boolean;
  children: ReactNode | ((value: AppRootShellStateValue) => ReactNode);
};
