import { TitleBar as AppTitleBar } from "@/components/app/chrome/TitleBar";
import { buildTitleBarProps } from "@/components/app/logic/buildTitleBarProps";
import { SettingsRuntimeProvider } from "@/components/app/panels/settings/SettingsRuntimeProvider";
import { SettingsDialog } from "@/components/app/dialogs/SettingsDialog";
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
      linuxUpdateStatus: args.topBanners.linuxUpdateStatus,
      onCopyLinuxUpdateCommand: args.topBanners.onCopyLinuxUpdateCommand,
      onOpenLinuxRelease: args.topBanners.onOpenLinuxRelease,
      onDismissLinuxUpdate: args.topBanners.onDismissLinuxUpdate
    }),
    settingsDialog: createElement(
      SettingsRuntimeProvider,
      {
        value: args.settings.runtimeValue,
        children: createElement(SettingsDialog, { open: args.settings.open, initialGroup: args.settings.initialGroup })
      }
    ),
  };
}
