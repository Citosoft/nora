import { useAppSafely } from "@/components/app/hooks/useAppSafely";
import type { UiState } from "@/components/app/types";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type UseAppMainOrchestrationResult = {
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
};

export const useAppMainOrchestration = (
  setUiState: Dispatch<SetStateAction<UiState>>,
  captureError: (error: unknown) => void
): UseAppMainOrchestrationResult => {
  const safely = useAppSafely(setUiState, captureError);
  return { safely };
};
