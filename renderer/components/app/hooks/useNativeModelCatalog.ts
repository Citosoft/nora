import { useCallback, useEffect, useSyncExternalStore } from "react";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ModelCatalogStore } from "@/components/app/types/modelPicker.types";

export function useNativeModelCatalog(store: ModelCatalogStore, provider: NativeProvider | null, enabled = true) {
  const key = provider ? nativeProviderKey(provider) : "";
  const snapshot = useCallback(() => store.get(key), [store, key]);
  const state = useSyncExternalStore(store.subscribe, snapshot);
  useEffect(() => { if (enabled && provider) void store.load(provider); }, [store, provider, enabled]);
  return state;
}
