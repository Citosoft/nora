import type { UiState } from "@/components/app/types";
import type { AppDomainState, AppState } from "@shared/appTypes";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type AppRootStateContextValue = {
  uiState: UiState;
  setUiState: Dispatch<SetStateAction<UiState>>;
  /** Canonical app snapshot: compact streams + nested agent/terminal reconcile (same as domain projection). */
  snapshot: AppState | null;
  domainState: AppDomainState;
};

export type AppRootStateProviderProps = {
  initialUiState: UiState;
  children: ReactNode;
};
