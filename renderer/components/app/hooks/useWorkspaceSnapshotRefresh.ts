import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { UiState } from "@/components/app/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef } from "react";

export function useWorkspaceSnapshotRefresh({
  setUiState,
  statusBar,
  captureError
}: {
  setUiState: Dispatch<SetStateAction<UiState>>;
  statusBar: StatusBarContextValue;
  captureError: (error: unknown) => void;
}): { refreshSnapshot: (statusMessage: string) => Promise<void> } {
  const refreshPollInFlightRef = useRef(false);

  const refreshSnapshot = useCallback(async (statusMessage: string): Promise<void> => {
    if (document.hidden || refreshPollInFlightRef.current) {
      return;
    }

    refreshPollInFlightRef.current = true;
    const statusId = statusBar.beginStatus(statusMessage, true);

    try {
      const next = normalizeSnapshot(await noraWorkspaceManagementClient.refreshWorkspace());
      setUiState((current) => ({ ...current, snapshot: next }));
    } catch (error: unknown) {
      captureError(error);
    } finally {
      refreshPollInFlightRef.current = false;
      statusBar.endStatus(statusId);
    }
  }, [captureError, setUiState, statusBar]);

  return { refreshSnapshot };
}
