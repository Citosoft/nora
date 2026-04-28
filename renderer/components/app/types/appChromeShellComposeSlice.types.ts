import type { AppChromeCompositionArgs } from "@/components/app/types/appChromeComposition.types";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { TitleBarBuildDeps } from "@/components/app/types/titleBarBuild.types";

/** Inputs for title bar, banners, status strip, and settings tab — one slice per chrome composition pass. */
export type AppChromeShellComposeSlice = {
  titleBar: TitleBarBuildDeps;
  topBanners: AppMainChromeTopBannersProps;
  statusBarChrome: AppChromeCompositionArgs["statusBar"];
  settingsGroup: SettingsGroup;
};
