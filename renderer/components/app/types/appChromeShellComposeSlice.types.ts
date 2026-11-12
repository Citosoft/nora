import type { WorkspaceStatusInput } from "@/components/app/types/workspaceUtilities.types";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type { UpdateIndicators } from "@/components/app/types/updateIndicators.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { TitleBarBuildDeps } from "@/components/app/types/titleBarBuild.types";

/** Inputs for title bar, banners, sidebar status, and settings tab — one slice per chrome composition pass. */
export type AppChromeShellComposeSlice = {
  titleBar: TitleBarBuildDeps;
  topBanners: AppMainChromeTopBannersProps;
  workspaceStatus: WorkspaceStatusInput;
  updateIndicators: UpdateIndicators;
  settingsGroup: SettingsGroup;
};
