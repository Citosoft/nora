import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type { SettingsGroup, SettingsRuntimeValue } from "@/components/app/types/settings.types";
import type { TitleBarBuildDeps } from "@/components/app/types/titleBarBuild.types";
import type { ReactElement } from "react";

export type AppChromeCompositionValue = {
  titleBar: ReactElement;
  topBanners: ReactElement;
  settingsDialog: ReactElement;
};

export type AppChromeCompositionArgs = {
  titleBar: TitleBarBuildDeps;
  topBanners: AppMainChromeTopBannersProps;
  settings: {
    open: boolean;
    runtimeValue: SettingsRuntimeValue;
    initialGroup: SettingsGroup;
  };
};
