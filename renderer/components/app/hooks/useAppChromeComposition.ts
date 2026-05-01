import { StatusBar as AppStatusBar } from "@/components/app/chrome/StatusBar";
import { TitleBar as AppTitleBar } from "@/components/app/chrome/TitleBar";
import { buildTitleBarProps } from "@/components/app/logic/buildTitleBarProps";
import { SettingsRuntimeProvider } from "@/components/app/panels/settings/SettingsRuntimeProvider";
import { SettingsPage as AppSettingsPage } from "@/components/app/panels/SettingsPage";
import type {
  AppChromeCompositionArgs,
  AppChromeCompositionValue
} from "@/components/app/types/appChromeComposition.types";
import { AppMainChromeTopBanners } from "@/components/app/views/AppMainChromeTopBanners";
import { createElement } from "react";

/** Maps already-shaped chrome args to elements; keep args narrow at call sites (`AppRootOrchestratedTree`). */
export function useAppChromeComposition(args: AppChromeCompositionArgs): AppChromeCompositionValue {
  return {
    titleBar: createElement(AppTitleBar, buildTitleBarProps(args.titleBar)),
    topBanners: createElement(AppMainChromeTopBanners, {
      autoUpdateStatus: args.topBanners.autoUpdateStatus,
      isInstallingDownloadedUpdate: args.topBanners.isInstallingDownloadedUpdate,
      onInstallDownloadedUpdate: args.topBanners.onInstallDownloadedUpdate,
      linuxUpdateStatus: args.topBanners.linuxUpdateStatus,
      onCopyLinuxUpdateCommand: args.topBanners.onCopyLinuxUpdateCommand,
      onOpenLinuxRelease: args.topBanners.onOpenLinuxRelease,
      onDismissLinuxUpdate: args.topBanners.onDismissLinuxUpdate
    }),
    statusBar: createElement(AppStatusBar, {
      entries: args.statusBar.entries,
      tools: args.statusBar.tools,
      agentSkillCatalogs: args.statusBar.agentSkillCatalogs,
      activeWorkspaceBranch: args.statusBar.activeWorkspaceBranch,
      activeWorkspaceWorktreeName: args.statusBar.activeWorkspaceWorktreeName,
      onInstallTool: args.statusBar.onInstallTool,
      onSwitchToolAccount: args.statusBar.onSwitchToolAccount,
      onOpenSkillsSettings: args.statusBar.onOpenSkillsSettings
    }),
    settingsPage: createElement(
      SettingsRuntimeProvider,
      {
        value: args.settings.runtimeValue,
        children: createElement(AppSettingsPage, { initialGroup: args.settings.initialGroup })
      }
    ),
  };
}
