import { CreateTaskDialog } from "@/components/app/dialogs/CreateTaskDialog";
import { useModalClusterPorts } from "@/components/app/hooks/useModalClusterPorts";
import { useAppModalDialogs } from "@/components/app/context/appModalDialogsContext";
import { AboutDialog as AppAboutDialog } from "@/components/app/dialogs/AboutDialog";
import { AddWorkspaceDialog as AppAddWorkspaceDialog } from "@/components/app/dialogs/AddWorkspaceDialog";
import { AnalyticsConsentDialog as AppAnalyticsConsentDialog } from "@/components/app/dialogs/AnalyticsConsentDialog";
import { BrowserCookieImportPromptDialog as AppBrowserCookieImportPromptDialog } from "@/components/app/dialogs/BrowserCookieImportPromptDialog";
import { CreatePullRequestDialog as AppCreatePullRequestDialog } from "@/components/app/dialogs/CreatePullRequestDialog";
import { CreateTerminalDialog as AppCreateTerminalDialog } from "@/components/app/dialogs/CreateTerminalDialog";
import { ErrorDialog as AppErrorDialog } from "@/components/app/dialogs/ErrorDialog";
import { KeyboardShortcutsDialog as AppKeyboardShortcutsDialog } from "@/components/app/dialogs/KeyboardShortcutsDialog";
import { LinuxAptSetupDialog as AppLinuxAptSetupDialog } from "@/components/app/dialogs/LinuxAptSetupDialog";
import { OAuthDeviceCodeDialog as AppOAuthDeviceCodeDialog } from "@/components/app/dialogs/OAuthDeviceCodeDialog";
import { RemoteWorkspaceDialog as AppRemoteWorkspaceDialog } from "@/components/app/dialogs/RemoteWorkspaceDialog";
import { RemoveMissingWorkspaceDialog as AppRemoveMissingWorkspaceDialog } from "@/components/app/dialogs/RemoveMissingWorkspaceDialog";
import { ResetWorkspacesDialog as AppResetWorkspacesDialog } from "@/components/app/dialogs/ResetWorkspacesDialog";
import { ResourceMonitorDialog as AppResourceMonitorDialog } from "@/components/app/dialogs/ResourceMonitorDialog";
import { StartupDependenciesDialog as AppStartupDependenciesDialog } from "@/components/app/dialogs/StartupDependenciesDialog";
import { WorkspaceSwitcherDialog as AppWorkspaceSwitcherDialog } from "@/components/app/dialogs/WorkspaceSwitcherDialog";
import { WorkspaceTerminalPresetsDialog as AppWorkspaceTerminalPresetsDialog } from "@/components/app/dialogs/WorkspaceTerminalPresetsDialog";

export const AppModalDialogs = () => {
  const d = useAppModalDialogs();
  const { modalDialogs: { createTaskDialog } } = useModalClusterPorts();

  return (
    <>
      {createTaskDialog && <CreateTaskDialog {...createTaskDialog} />}
      <AppErrorDialog {...d.error} />
      <AppOAuthDeviceCodeDialog {...d.oauthDevice} />
      <AppStartupDependenciesDialog {...d.startupDependencies} />
      <AppRemoveMissingWorkspaceDialog {...d.removeMissingWorkspace} />
      <AppResetWorkspacesDialog {...d.resetWorkspaces} />
      <AppWorkspaceTerminalPresetsDialog {...d.workspaceTerminalPresets} />
      <AppCreateTerminalDialog {...d.createTerminal} />
      <AppCreatePullRequestDialog {...d.createPullRequest} />
      <AppAddWorkspaceDialog {...d.addWorkspace} />
      <AppRemoteWorkspaceDialog {...d.remoteWorkspace} />
      <AppLinuxAptSetupDialog {...d.linuxAptSetup} />
      <AppBrowserCookieImportPromptDialog {...d.browserCookieImport} />
      <AppAnalyticsConsentDialog {...d.analyticsConsent} />
      <AppAboutDialog {...d.about} />
      <AppKeyboardShortcutsDialog {...d.keyboardShortcuts} />
      <AppResourceMonitorDialog {...d.resourceMonitor} />
      <AppWorkspaceSwitcherDialog {...d.workspaceSwitcher} />
    </>
  );
};
