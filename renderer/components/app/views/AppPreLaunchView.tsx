import { SplashScreen as AppSplashScreen } from "@/components/app/chrome/SplashScreen";
import { TitleBar as AppTitleBar } from "@/components/app/chrome/TitleBar";
import { AboutDialog as AppAboutDialog } from "@/components/app/dialogs/AboutDialog";
import { AddWorkspaceDialog as AppAddWorkspaceDialog } from "@/components/app/dialogs/AddWorkspaceDialog";
import { KeyboardShortcutsDialog as AppKeyboardShortcutsDialog } from "@/components/app/dialogs/KeyboardShortcutsDialog";
import { OnboardingDialog as AppOnboardingDialog } from "@/components/app/dialogs/OnboardingDialog";
import { RemoteWorkspaceDialog as AppRemoteWorkspaceDialog } from "@/components/app/dialogs/RemoteWorkspaceDialog";
import { StartupDependenciesDialog as AppStartupDependenciesDialog } from "@/components/app/dialogs/StartupDependenciesDialog";
import { shouldRenderLoadingOnboardingDialog } from "@/components/app/logic/startupDialogVisibility";
import type { AppPreLaunchViewProps } from "@/components/app/types/appPreLaunchView.types";
import { AppBootstrapShell } from "@/components/app/views/AppBootstrapShell";
import { AppMainChromeTopBanners } from "@/components/app/views/AppMainChromeTopBanners";

export function AppPreLaunchView({
  snapshot,
  isOnboardingOpen,
  statusBar,
  loadingTitleBarProps,
  onboardingTitleBarProps,
  topBannersProps,
  loadingOnboardingDialogProps,
  onboardingOnboardingDialogProps,
  startupDependenciesDialogProps,
  loadingFooter,
  onboardingFooter,
  addWorkspaceDialogProps,
  remoteWorkspaceDialogProps,
  keyboardShortcutsDialogProps,
  aboutDialogProps
}: AppPreLaunchViewProps) {
  if (!snapshot) {
    return (
      <AppBootstrapShell
        statusBar={statusBar}
        titleBar={<AppTitleBar {...loadingTitleBarProps} />}
        topBanners={<AppMainChromeTopBanners {...topBannersProps} />}
        mainContent={
          <>
            <AppSplashScreen
              title="Nora is starting"
              subtitle="Warming up agents and syncing workspaces."
            />
            {shouldRenderLoadingOnboardingDialog(isOnboardingOpen) ? (
              <AppOnboardingDialog {...loadingOnboardingDialogProps} />
            ) : null}
            <AppStartupDependenciesDialog {...startupDependenciesDialogProps} />
          </>
        }
        footer={loadingFooter}
      />
    );
  }

  if (isOnboardingOpen && onboardingTitleBarProps && onboardingOnboardingDialogProps) {
    return (
      <AppBootstrapShell
        statusBar={statusBar}
        titleBar={<AppTitleBar {...onboardingTitleBarProps} />}
        topBanners={<AppMainChromeTopBanners {...topBannersProps} />}
        mainContent={
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-background" />
            <AppOnboardingDialog {...onboardingOnboardingDialogProps} />
            <AppAddWorkspaceDialog {...addWorkspaceDialogProps} />
            <AppRemoteWorkspaceDialog {...remoteWorkspaceDialogProps} />
            <AppKeyboardShortcutsDialog {...keyboardShortcutsDialogProps} />
            <AppAboutDialog {...aboutDialogProps} />
          </>
        }
        footer={onboardingFooter}
      />
    );
  }

  return null;
}
