import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ModelCatalogDeps, ModelCatalogState, ModelCatalogStore } from "@/components/app/types/modelPicker.types";

const idle: ModelCatalogState = { status: "idle" };

export function nativeProviderKey(provider: Pick<NativeProvider, "kind" | "instanceId">): string {
  return JSON.stringify([provider.kind, provider.instanceId]);
}

// Catalogs belong to an execution client and checkout, independently of which view requested them.
const clients = new WeakMap<ModelCatalogDeps["client"], Map<string, ModelCatalogStore>>();
const MAX_CHECKOUTS = 32;

export function checkoutModelCatalog(deps: ModelCatalogDeps): ModelCatalogStore {
  const { client, workspace } = deps;
  let stores = clients.get(client);
  if (!stores) { stores = new Map(); clients.set(client, stores); }
  const key = JSON.stringify([workspace.environmentId, workspace.projectId, workspace.checkoutId, workspace.path,
    workspace.branch, workspace.access, workspace.versionControl]);
  const store = stores.get(key) ?? createModelCatalogStore(deps);
  stores.delete(key);
  stores.set(key, store);
  if (stores.size > MAX_CHECKOUTS) {
    const oldest = stores.keys().next();
    if (!oldest.done) stores.delete(oldest.value);
  }
  return store;
}

/** One workspace-scoped catalog source for both the committed selection and popover browsing. */
export function createModelCatalogStore({ client, workspace }: ModelCatalogDeps): ModelCatalogStore {
  const states = new Map<string, ModelCatalogState>();
  const pending = new Map<string, Promise<void>>();
  const freshUntil = new Map<string, number>();
  const listeners = new Set<() => void>();
  const publish = (key: string, state: ModelCatalogState): void => {
    states.set(key, state);
    if (state.status === "available" || state.status === "unavailable") {
      freshUntil.set(key, Date.now() + (state.status === "available" ? 5 * 60_000 : 30_000));
    }
    for (const listener of [...listeners]) {
      try { listener(); } catch { /* A view observer cannot invalidate a discovered catalog. */ }
    }
  };
  return {
    get: (key) => states.get(key) ?? idle,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load(provider, refresh = false) {
      const key = nativeProviderKey(provider);
      const loading = pending.get(key);
      if (loading) return loading;
      if (!refresh && Date.now() < (freshUntil.get(key) ?? 0)) return Promise.resolve();

      const work = Promise.resolve().then(() => client.catalog(provider.kind, provider.instanceId, workspace)).then((result) => {
        if (result.status === "available" && (result.catalog.kind !== provider.kind || result.catalog.instanceId !== provider.instanceId)) {
          throw new Error("Catalog identity does not match its provider");
        }
        publish(key, result);
      }).catch(() => {
        publish(key, { status: "unavailable", failure: { code: "provider",
          message: "Models could not be loaded. Check this provider's runtime and sign-in, then try again.", retryable: true } });
      }).finally(() => { pending.delete(key); });
      pending.set(key, work);
      if (states.get(key)?.status !== "available") publish(key, { status: "loading" });
      return work;
    }
  };
}

export async function readCheckoutModelCatalog(deps: ModelCatalogDeps, provider: Pick<NativeProvider, "kind" | "instanceId">): Promise<ModelCatalogState> {
  const store = checkoutModelCatalog(deps);
  await store.load(provider);
  return store.get(nativeProviderKey(provider));
}
