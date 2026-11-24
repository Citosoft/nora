import { useCallback, useEffect, useReducer } from "react";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ModelCatalogState, ModelCatalogStore } from "@/components/app/types/modelPicker.types";

/** Loads several providers' catalogs at once and re-renders as each arrives; returns a reader keyed by provider key. */
export function useModelCatalogs(store: ModelCatalogStore, providers: readonly NativeProvider[]): (key: string) => ModelCatalogState {
  const [version, changed] = useReducer((count: number) => count + 1, 0);
  useEffect(() => store.subscribe(changed), [store]);
  useEffect(() => { for (const provider of providers) void store.load(provider); }, [store, providers]);
  // `version` makes the reader change identity whenever the store publishes, so memoised consumers recompute.
  return useCallback((key: string) => (void version, store.get(key)), [store, version]);
}
