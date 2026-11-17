import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ModelCatalogDeps, ModelCatalogState, ModelCatalogStore } from "@/components/app/types/modelPicker.types";

const idle: ModelCatalogState = { status: "idle" };

export function nativeProviderKey(provider: Pick<NativeProvider, "kind" | "instanceId">): string {
  return JSON.stringify([provider.kind, provider.instanceId]);
}

/** One workspace-scoped catalog source for both the committed selection and popover browsing. */
export function createModelCatalogStore({ client, workspace }: ModelCatalogDeps): ModelCatalogStore {
  const states = new Map<string, ModelCatalogState>();
  const pending = new Map<string, Promise<void>>();
  const versions = new Map<string, number>();
  const listeners = new Set<() => void>();
  const publish = (key: string, state: ModelCatalogState): void => {
    states.set(key, state);
    for (const listener of [...listeners]) {
      try { listener(); } catch { /* A view observer cannot invalidate a discovered catalog. */ }
    }
  };
  return {
    get: (key) => states.get(key) ?? idle,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load(provider, refresh = false) {
      const key = nativeProviderKey(provider);
      if (!refresh) {
        const loading = pending.get(key);
        if (loading) return loading;
        if (states.has(key)) return Promise.resolve();
      }
      const version = (versions.get(key) ?? 0) + 1;
      versions.set(key, version);
      publish(key, { status: "loading" });
      const work = Promise.resolve().then(() => client.catalog(provider.kind, provider.instanceId, workspace)).then((result) => {
        if (versions.get(key) !== version) return;
        if (result.status === "available" && (result.catalog.kind !== provider.kind || result.catalog.instanceId !== provider.instanceId)) {
          throw new Error("Catalog identity does not match its provider");
        }
        publish(key, result);
      }).catch(() => {
        if (versions.get(key) === version) publish(key, { status: "unavailable", failure: { code: "provider",
          message: "Models could not be loaded. Check this provider's runtime and sign-in, then try again.", retryable: true } });
      }).finally(() => { if (versions.get(key) === version) pending.delete(key); });
      pending.set(key, work);
      return work;
    }
  };
}
