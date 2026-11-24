import { useMemo } from "react";
import { Star } from "lucide-react";
import { sameModel } from "@shared/personalization/favoriteModels";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { useModelCatalogs } from "@/components/app/hooks/useModelCatalogs";
import { favoriteModelRows } from "@/components/app/logic/favoriteModelRows";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { FavoriteModelListProps } from "@/components/app/types/modelPicker.types";
import { NativeModelRow } from "./NativeModelRow";

/** Favourite models from every installed provider, in the order they were starred. */
export function NativeFavoriteModelList({ providers, store, selectedProviderKey, selectedModelId, locked, favorites, onSelect }: FavoriteModelListProps) {
  const favoriteProviders = useMemo(() => providers.filter((provider) => favorites.models.some((entry) => entry.kind === provider.kind && entry.instanceId === provider.instanceId)),
    [providers, favorites.models]);
  const catalog = useModelCatalogs(store, favoriteProviders);
  const rows = useMemo(() => favoriteModelRows(favorites.models, providers, catalog), [favorites.models, providers, catalog]);
  if (!rows.length) return <p className="flex items-start gap-2 px-3 py-5 text-xs leading-relaxed text-muted-foreground">
    <Star className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Star a model in any provider's list to keep it here for quick switching.</p>;
  return <div role="group" aria-label="Favourite models" className="space-y-1">
    {rows.map((row) => {
      const state = row.provider ? catalog(nativeProviderKey(row.provider)) : null;
      const connection = state?.status === "available" ? state.catalog.connection : undefined;
      const signInRequired = state?.status === "available" && state.catalog.authentication === "required";
      const ready = row.status === "ready" ? row : null;
      const description = row.status === "unavailable" ? `${row.providerLabel} · ${row.reason}`
        : row.status === "loading" ? `${row.providerLabel} · Loading…` : row.providerLabel;
      return <NativeModelRow key={`${row.favorite.kind}:${row.favorite.instanceId}:${row.favorite.model}`}
        label={ready ? ready.model.name || ready.model.id : row.favorite.model} description={description}
        icon={<AgentToolIcon connection={connection} toolId={row.favorite.kind} label="" className="size-5 shrink-0" imageClassName="size-4" />}
        selected={!!row.provider && nativeProviderKey(row.provider) === selectedProviderKey && row.favorite.model === selectedModelId}
        disabled={locked || !ready || signInRequired} favorite favoriteDisabled={!!favorites.pending && sameModel(favorites.pending, row.favorite)}
        onSelect={() => { if (ready) onSelect(ready.provider, ready.model); }} onFavorite={(value) => favorites.toggle(row.favorite, value)} />;
    })}
  </div>;
}
