import type {
  AppRootStateContextValue,
  AppRootStateProviderProps
} from "@/components/app/types/appRootStateContext.types";
import { projectAppState } from "@/components/app/logic/projectAppState";
import { getEmptyAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import { createContext, useContext, useMemo, useState, type ReactElement } from "react";

const AppRootStateContext = createContext<AppRootStateContextValue | null>(null);

export function AppRootStateProvider({
  initialUiState,
  children
}: AppRootStateProviderProps): ReactElement {
  const [uiState, setUiState] = useState(initialUiState);

  const projection = useMemo(() => uiState.snapshot ? projectAppState(uiState.snapshot)
    : { snapshot: null, domainState: getEmptyAppDomainState() }, [uiState.snapshot]);
  const value = useMemo<AppRootStateContextValue>(() => ({
    uiState,
    setUiState,
    ...projection
  }), [uiState, projection]);

  return <AppRootStateContext.Provider value={value}>{children}</AppRootStateContext.Provider>;
}

export function useAppRootState(): AppRootStateContextValue {
  const value = useContext(AppRootStateContext);
  if (!value) {
    throw new Error("useAppRootState must be used within AppRootStateProvider.");
  }

  return value;
}
