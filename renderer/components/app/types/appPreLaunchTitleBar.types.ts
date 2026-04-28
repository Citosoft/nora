import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { AppView } from "@/components/app/types";
import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";
import type { AppSettings, AppState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type CommonPreLaunchTitleBarInput = Pick<
  TitleBarProps,
  | "windowUiState"
  | "useMacTitleBarChrome"
  | "themeMode"
  | "resolvedTheme"
  | "onToggleTheme"
  | "onOpenSettings"
  | "onOpenKeyboardShortcuts"
  | "onOpenAbout"
  | "onSubmitIssue"
  | "installedIdes"
  | "isLoadingInstalledIdes"
  | "defaultIdeId"
  | "onAddWorkspace"
  | "onAddRemoteWorkspace"
  | "onOpenStartupDependencies"
>;

export type PreLaunchOnboardingTitleBarWorkspaceInput = {
  snapshot: AppState;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  uiCommands: Pick<AppUiCommands, "openCreateAgentDialog" | "openCreateTerminalDialog">;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  focusLocalTerminalDock: () => void | Promise<void>;
  focusPreviousSessionTab: () => void;
  focusNextSessionTab: () => void;
  defaultTerminalShellId: string | null;
  terminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"];
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  handleOpenRecentWorkspace: (projectRoot: string, projectName: string) => Promise<void>;
};
