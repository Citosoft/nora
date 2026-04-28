import type {
  UseAppRootSnapshotCommandsArgs,
  UseAppRootSnapshotCommandsResult
} from "@/components/app/types/useAppRootSnapshotCommands.types";
import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { AppState } from "@shared/appTypes";
import { useCallback } from "react";

export const useAppRootSnapshotCommands = ({
  setUiState,
  statusBar,
  safely,
  refreshSnapshot
}: UseAppRootSnapshotCommandsArgs): UseAppRootSnapshotCommandsResult => {
  const updateSnapshotState = useCallback((next: AppState): void => {
    const snapshot = normalizeSnapshot(next);
    setUiState((current) => ({
      ...current,
      activeErrorMessage: snapshot.errorMessage || current.activeErrorMessage,
      snapshot
    }));
  }, [setUiState]);

  const runWithStatus = useCallback(
    async (message: string, action: () => Promise<AppState>): Promise<AppState | null> => {
      const statusId = statusBar.beginStatus(message, true);
      try {
        return await safely(action);
      } finally {
        statusBar.endStatus(statusId);
      }
    },
    [safely, statusBar]
  );

  const safelyAndRefresh = useCallback(
    async (action: () => Promise<AppState>, statusMessage = "Refreshing git changes"): Promise<AppState | null> => {
      const next = await safely(action);
      if (next?.project) {
        void refreshSnapshot(statusMessage);
      }
      return next;
    },
    [refreshSnapshot, safely]
  );

  return {
    updateSnapshotState,
    runWithStatus,
    safelyAndRefresh
  };
};
