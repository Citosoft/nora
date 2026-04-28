import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

import type { UiState } from "@/components/app/types";

export type UseAppRootSnapshotCommandsArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
  statusBar: StatusBarContextValue;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  refreshSnapshot: (statusMessage: string) => Promise<void>;
};

export type UseAppRootSnapshotCommandsResult = {
  updateSnapshotState: (next: AppState) => void;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  safelyAndRefresh: (action: () => Promise<AppState>, statusMessage?: string) => Promise<AppState | null>;
};
