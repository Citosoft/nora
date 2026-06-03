import { noraRemoteWorkspaceClient } from "@/components/app/clients/noraRemoteWorkspaceClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import type { KeyboardShortcutsDialogProps } from "@/components/app/dialogs/KeyboardShortcutsDialog";
import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { UiState, WindowUiState } from "@/components/app/types";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type { CommonPreLaunchTitleBarInput } from "@/components/app/types/appPreLaunchTitleBar.types";
import type {
  AboutDialogProps,
  AddWorkspaceDialogProps,
  RemoteWorkspaceDialogProps,
  StartupDependenciesDialogProps,
  TitleBarProps
} from "@/components/app/types/chromeDialog.types";
import type { AppState } from "@shared/appTypes";
import type { StartupDependency, StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import type { Dispatch, SetStateAction } from "react";

export function buildPreLaunchTitleBarCommonInput(args: {
  windowUiState: WindowUiState;
  useMacTitleBarChrome: boolean;
  themeMode: TitleBarProps["themeMode"];
  resolvedTheme: TitleBarProps["resolvedTheme"];
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenAbout: () => void;
  onSubmitIssue: () => void;
  installedIdes: TitleBarProps["installedIdes"];
  isLoadingInstalledIdes: boolean;
  defaultIdeId: string | null;
  onAddWorkspace: () => void;
  onAddRemoteWorkspace: () => void;
  onOpenStartupDependencies: () => void;
  onOpenOnboarding: () => void;
}): CommonPreLaunchTitleBarInput {
  return {
    windowUiState: args.windowUiState,
    useMacTitleBarChrome: args.useMacTitleBarChrome,
    themeMode: args.themeMode,
    resolvedTheme: args.resolvedTheme,
    onToggleTheme: args.onToggleTheme,
    onOpenSettings: args.onOpenSettings,
    onOpenKeyboardShortcuts: args.onOpenKeyboardShortcuts,
    onOpenAbout: args.onOpenAbout,
    onSubmitIssue: args.onSubmitIssue,
    installedIdes: args.installedIdes,
    isLoadingInstalledIdes: args.isLoadingInstalledIdes,
    defaultIdeId: args.defaultIdeId,
    onAddWorkspace: args.onAddWorkspace,
    onAddRemoteWorkspace: args.onAddRemoteWorkspace,
    onOpenStartupDependencies: args.onOpenStartupDependencies,
    onOpenOnboarding: args.onOpenOnboarding
  };
}

export function buildPreLaunchTopBannersProps(args: {
  linuxUpdateStatus: AppMainChromeTopBannersProps["linuxUpdateStatus"];
  onCopyLinuxUpdateCommand: () => void;
  onOpenLinuxRelease: () => void;
  onDismissLinuxUpdate: () => void;
}): AppMainChromeTopBannersProps {
  return {
    linuxUpdateStatus: args.linuxUpdateStatus,
    onCopyLinuxUpdateCommand: args.onCopyLinuxUpdateCommand,
    onOpenLinuxRelease: args.onOpenLinuxRelease,
    onDismissLinuxUpdate: args.onDismissLinuxUpdate
  };
}

export function buildPreLaunchStartupDependenciesDialogProps(args: {
  shouldShowStartupDependenciesDialog: boolean;
  effectiveStartupDependencyReport: StartupDependencyReport | null;
  isStartupDependencyDialogBusy: boolean;
  startupDependencyInstallTargetId: StartupDependencyId | null;
  startupDependencyInstallErrorMessage: string | null;
  simulatedMissingDependencyIds: StartupDependencyId[];
  handleStartupDependenciesDialogOpenChange: (open: boolean) => void;
  installStartupDependencyWithRefresh: (dependencyId: StartupDependencyId) => Promise<void>;
  copyStartupDependencyInstructions: (dependency: StartupDependency) => Promise<void>;
  toggleSimulatedMissingDependency: (dependencyId: StartupDependencyId) => void;
  clearSimulatedMissingDependencies: () => void;
  reloadStartupDependencyReport: () => Promise<void>;
}): StartupDependenciesDialogProps {
  return {
    open: args.shouldShowStartupDependenciesDialog,
    dependencies: args.effectiveStartupDependencyReport?.dependencies ?? [],
    isLoading: args.isStartupDependencyDialogBusy,
    installTargetId: args.startupDependencyInstallTargetId,
    installErrorMessage: args.startupDependencyInstallErrorMessage,
    simulatedMissingDependencyIds: args.simulatedMissingDependencyIds,
    onOpenChange: args.handleStartupDependenciesDialogOpenChange,
    onInstallDependency: (dependencyId) => {
      void args.installStartupDependencyWithRefresh(dependencyId);
    },
    onCopyInstructions: args.copyStartupDependencyInstructions,
    onToggleSimulatedMissing: args.toggleSimulatedMissingDependency,
    onClearSimulation: args.clearSimulatedMissingDependencies,
    onReload: () => {
      void args.reloadStartupDependencyReport();
    },
    onQuit: () => {
      void noraSystemClient.closeWindow();
    }
  };
}

export function buildPreLaunchAddWorkspaceDialogProps(args: {
  uiState: UiState;
  uiCommands: AppUiCommands;
  onChooseLocalWorkspace: () => void;
}): AddWorkspaceDialogProps {
  return {
    open: args.uiState.showAddWorkspaceModal,
    onOpenChange: args.uiCommands.setAddWorkspaceDialogOpen,
    onChooseLocal: args.onChooseLocalWorkspace,
    onChooseRemote: args.uiCommands.openRemoteWorkspaceDialog
  };
}

export function buildPreLaunchRemoteWorkspaceDialogProps(args: {
  uiState: UiState;
  setUiState: Dispatch<SetStateAction<UiState>>;
  normalizeSnapshot: (next: AppState) => AppState;
  dismissWorkspaceLoading: () => void;
  uiCommands: AppUiCommands;
}): RemoteWorkspaceDialogProps {
  return {
    open: args.uiState.showRemoteWorkspaceModal,
    onOpenChange: args.uiCommands.setRemoteWorkspaceDialogOpen,
    onConnect: async (payload) => {
      args.uiCommands.closeWorkspaceDialogStack();
      try {
        const next = args.normalizeSnapshot(await noraRemoteWorkspaceClient.openRemoteWorkspace(payload));
        args.setUiState((current) => ({
          ...current,
          activeErrorMessage: next.errorMessage || current.activeErrorMessage,
          snapshot: next
        }));
      } catch (error) {
        args.dismissWorkspaceLoading();
        throw error;
      }
    }
  };
}

export function buildPreLaunchKeyboardShortcutsDialogProps(args: {
  uiState: UiState;
  windowUiState: WindowUiState;
  uiCommands: AppUiCommands;
}): KeyboardShortcutsDialogProps {
  return {
    open: args.uiState.showKeyboardShortcutsDialog,
    onOpenChange: args.uiCommands.setKeyboardShortcutsDialogOpen,
    platform: args.windowUiState.platform
  };
}

export function buildPreLaunchAboutDialogProps(args: {
  uiState: UiState;
  uiCommands: AppUiCommands;
  focusLocalTerminalDock: () => Promise<void>;
}): AboutDialogProps {
  return {
    open: args.uiState.showAboutDialog,
    onOpenChange: args.uiCommands.setAboutDialogOpen,
    focusLocalTerminalDock: args.focusLocalTerminalDock
  };
}
