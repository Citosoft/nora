import { useEffect, useState } from "react";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { appRootInitialWindowUiState } from "@/components/app/logic/appRootInitialState";
import type { WindowUiState } from "@/components/app/types";

export function useWindowUiState(initialState: WindowUiState = appRootInitialWindowUiState): WindowUiState {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let mounted = true;
    const update = (next: WindowUiState): void => {
      if (mounted) setState(next);
    };
    const unsubscribe = noraSystemClient.onWindowStateChanged(update);
    void noraSystemClient.getWindowState().then(update).catch(() => {
      // Keep window controls available even if the initial state request fails.
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
