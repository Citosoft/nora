import type { UiState, WindowUiState } from "@/components/app/types";
import type { AppToast } from "@/components/app/types/appToast.types";
import type { AppState } from "@shared/appTypes";
import type { StartupDependencyReport } from "@shared/types/startupDependency.types";
import type { Dispatch, SetStateAction } from "react";

export type UseAppToolInstallFlowsArgs = {
  windowPlatform: WindowUiState["platform"];
  installCommandDrafts: UiState["installCommandDrafts"];
  setUiState: Dispatch<SetStateAction<UiState>>;
  effectiveStartupDependencyReport: StartupDependencyReport | null;
  openStartupDependenciesDialog: () => void;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  setActiveView: Dispatch<SetStateAction<"main" | "settings">>;
  showToast: (toast: Omit<AppToast, "id">) => void;
  captureError: (error: unknown) => void;
};

export type UseAppToolInstallFlowsResult = {
  isRefreshingOnboardingTools: boolean;
  resolveInstallCommand: (toolId: string, installTemplate: string) => string;
  refreshOnboardingTools: () => Promise<void>;
  installOnboardingTool: (toolId: string) => Promise<void>;
  installStatusBarTool: (toolId: string) => Promise<void>;
  switchStatusBarToolAccount: (toolId: string) => Promise<void>;
  setOnboardingToolEnabled: (toolId: string, enabled: boolean) => Promise<void>;
};
