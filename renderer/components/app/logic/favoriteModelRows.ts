import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { FavoriteModelRow, ModelCatalogState } from "@/components/app/types/modelPicker.types";
import { nativeProviderKey } from "./modelCatalogStore";

/** Names a provider, adding the account when several accounts of the same runtime are installed. */
export function providerDisplayName(provider: NativeProvider, providers: readonly NativeProvider[]): string {
  return providers.filter((entry) => entry.kind === provider.kind).length > 1 ? `${provider.label} · ${provider.instanceId}` : provider.label;
}

/** Resolves favourites against the installed providers and whatever catalogs have loaded, keeping the saved order. */
export function favoriteModelRows(favorites: readonly ThreadModelDefault[], providers: readonly NativeProvider[],
  catalog: (key: string) => ModelCatalogState): FavoriteModelRow[] {
  return favorites.map((favorite) => {
    const provider = providers.find((entry) => entry.kind === favorite.kind && entry.instanceId === favorite.instanceId) ?? null;
    if (!provider) return { status: "unavailable", favorite, provider, providerLabel: `${favorite.kind} · ${favorite.instanceId}`, reason: "This provider isn't installed on this computer." };
    const providerLabel = providerDisplayName(provider, providers);
    const state = catalog(nativeProviderKey(provider));
    if (state.status === "idle" || state.status === "loading") return { status: "loading", favorite, provider, providerLabel };
    if (state.status === "unavailable") return { status: "unavailable", favorite, provider, providerLabel, reason: state.failure.message };
    const model = state.catalog.models.find((entry) => entry.id === favorite.model);
    if (!model) return { status: "unavailable", favorite, provider, providerLabel, reason: `${provider.label} no longer offers this model.` };
    return { status: "ready", favorite, provider, model, providerLabel };
  });
}
