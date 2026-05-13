import type { StatusBarContextValue } from "@/components/app/types/component.types";
import type {
  UseBrowserCookieImportResult,
  UseStartupDependenciesResult
} from "@/components/app/types/appHooks.types";
import type {
  UseAnalyticsConsentPromptResult,
  UseLinuxAptSetupPromptResult
} from "@/components/app/types/workflow.types";
import type { AppView, UiState } from "@/components/app/types";
import type { AppSettings } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type UseAppRootDialogsStateArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
  appSettings: AppSettings;
  isAppSettingsLoaded: boolean;
  captureError: (error: unknown) => void;
  activeView: AppView;
  focusedBrowserTabId: string | null;
  updateAnalyticsConsentStatus: (status: AppSettings["analyticsConsentStatus"]) => Promise<void>;
  updateLinuxAptSetupPromptDismissed: (dismissed: boolean) => Promise<void>;
  updateBrowserPreferences: (next: { browserDataImportPromptSeen: boolean }) => Promise<void>;
  flashStatus: (message: string, durationMs?: number) => void;
  statusBar: StatusBarContextValue;
};

export type UseAppRootDialogsStateResult = UseStartupDependenciesResult &
  UseAnalyticsConsentPromptResult &
  UseLinuxAptSetupPromptResult &
  UseBrowserCookieImportResult;
