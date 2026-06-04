import type { KeyboardShortcutsDialogProps } from "@/components/app/dialogs/KeyboardShortcutsDialog";
import type { OnboardingDialogProps } from "@/components/app/dialogs/OnboardingDialog";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type {
  AboutDialogProps,
  AddWorkspaceDialogProps,
  RemoteWorkspaceDialogProps,
  ResourceMonitorDialogProps,
  StartupDependenciesDialogProps,
  TitleBarProps
} from "@/components/app/types/chromeDialog.types";
import type { AppState } from "@shared/appTypes";
import type { ReactElement } from "react";

export type AppPreLaunchViewProps = {
  snapshot: AppState | null;
  isOnboardingOpen: boolean;
  statusBar: StatusBarContextValue;
  loadingTitleBarProps: TitleBarProps;
  onboardingTitleBarProps: TitleBarProps | null;
  topBannersProps: AppMainChromeTopBannersProps;
  loadingOnboardingDialogProps: OnboardingDialogProps;
  onboardingOnboardingDialogProps: OnboardingDialogProps | null;
  startupDependenciesDialogProps: StartupDependenciesDialogProps;
  loadingFooter: ReactElement;
  onboardingFooter: ReactElement;
  addWorkspaceDialogProps: AddWorkspaceDialogProps;
  remoteWorkspaceDialogProps: RemoteWorkspaceDialogProps;
  keyboardShortcutsDialogProps: KeyboardShortcutsDialogProps;
  resourceMonitorDialogProps: ResourceMonitorDialogProps;
  aboutDialogProps: AboutDialogProps;
};
