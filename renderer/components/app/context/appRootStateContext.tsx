import type {
  AppRootStateContextValue,
  AppRootStateProviderProps
} from "@/components/app/types/appRootStateContext.types";
import { appStateFromAppDomainState } from "@/components/app/logic/appStateFromAppDomainState";
import { getEmptyAppDomainState, hydrateAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import { createContext, useContext, useMemo, useState, type ReactElement } from "react";

const AppRootStateContext = createContext<AppRootStateContextValue | null>(null);

export function AppRootStateProvider({
  initialUiState,
  children
}: AppRootStateProviderProps): ReactElement {
  const [uiState, setUiState] = useState(initialUiState);

  const value = useMemo<AppRootStateContextValue>(() => {
    const rawSnapshot = uiState.snapshot;
    const domainState = rawSnapshot ? hydrateAppDomainState(rawSnapshot) : getEmptyAppDomainState();
    const snapshot = rawSnapshot ? appStateFromAppDomainState(domainState) : null;

    return {
      uiState,
      setUiState,
      snapshot,
      domainState
    };
  }, [uiState]);

  return <AppRootStateContext.Provider value={value}>{children}</AppRootStateContext.Provider>;
}

export function useAppRootState(): AppRootStateContextValue {
  const value = useContext(AppRootStateContext);
  if (!value) {
    throw new Error("useAppRootState must be used within AppRootStateProvider.");
  }

  return value;
}
