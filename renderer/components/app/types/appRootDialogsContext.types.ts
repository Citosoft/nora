import type { UseAppRootDialogsStateResult } from "@/components/app/types/useAppRootDialogsState.types";
import type { AppSettings } from "@shared/appTypes";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type AppRootDialogsContextValue = UseAppRootDialogsStateResult & {
  isCreatePullRequestDialogOpen: boolean;
  setIsCreatePullRequestDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export type AppRootDialogsProviderProps = {
  appSettings: AppSettings;
  isAppSettingsLoaded: boolean;
  updateAnalyticsConsentStatus: (status: AppSettings["analyticsConsentStatus"]) => Promise<void>;
  updateLinuxAptSetupPromptDismissed: (dismissed: boolean) => Promise<void>;
  updateBrowserPreferences: (next: { browserDataImportPromptSeen: boolean }) => Promise<void>;
  captureError: (error: unknown) => void;
  flashStatus: (message: string, durationMs?: number) => void;
  statusBar: import("@/components/app/types/component.types").StatusBarContextValue;
  children: ReactNode;
};
