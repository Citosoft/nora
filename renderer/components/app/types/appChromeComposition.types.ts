import type { StatusBarEntry } from "@/components/app/types";
import type { AppMainChromeTopBannersProps } from "@/components/app/types/appMainChromeTopBanners.types";
import type { SettingsGroup, SettingsRuntimeValue } from "@/components/app/types/settings.types";
import type { TitleBarBuildDeps } from "@/components/app/types/titleBarBuild.types";
import type { AgentCatalogEntry, AgentSkillCatalog } from "@shared/appTypes";
import type { ReactElement } from "react";

export type AppChromeCompositionValue = {
  titleBar: ReactElement;
  topBanners: ReactElement;
  statusBar: ReactElement;
  settingsPage: ReactElement;
};

export type AppChromeCompositionArgs = {
  titleBar: TitleBarBuildDeps;
  topBanners: AppMainChromeTopBannersProps;
  statusBar: {
    entries: StatusBarEntry[];
    tools: AgentCatalogEntry[];
    agentSkillCatalogs: AgentSkillCatalog[];
    onInstallTool: (toolId: string) => Promise<void> | void;
    onSwitchToolAccount: (toolId: string) => Promise<void> | void;
    onOpenSkillsSettings: () => void;
  };
  settings: {
    runtimeValue: SettingsRuntimeValue;
    initialGroup: SettingsGroup;
  };
};
