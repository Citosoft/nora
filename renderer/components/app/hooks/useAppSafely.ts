import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { UiState } from "@/components/app/types";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

export const useAppSafely = (
  setUiState: Dispatch<SetStateAction<UiState>>,
  captureError: (error: unknown) => void
): ((action: () => Promise<AppState>) => Promise<AppState | null>) =>
  useCallback(
    async (action) => {
      try {
        const next = normalizeSnapshot(await action());
        setUiState((current) => ({
          ...current,
          activeErrorMessage: next.errorMessage || current.activeErrorMessage,
          snapshot: next
        }));
        return next;
      } catch (error: unknown) {
        captureError(error);
        return null;
      }
    },
    [captureError, setUiState]
  );
