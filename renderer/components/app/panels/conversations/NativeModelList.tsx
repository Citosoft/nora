import { LoaderCircle } from "lucide-react";
import { isFavoriteModel, sameModel } from "@shared/personalization/favoriteModels";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelListProps } from "@/components/app/types/modelPicker.types";
import { Button } from "@/components/ui/button";
import { NativeModelRow } from "./NativeModelRow";

export function NativeModelList({ provider, state, selectedProviderKey, selectedModelId, locked, favorites, onSelect, onOpenProviderSettings }: ModelListProps) {
  if (!provider) return <p className="px-3 py-5 text-sm text-muted-foreground">No providers are configured. Install and sign in to a supported runtime to choose a model.</p>;
  if (state.status === "idle" || state.status === "loading") return <p role="status" className="flex items-center gap-2 px-3 py-5 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading models…</p>;
  if (state.status === "unavailable") return <p role="alert" className="px-3 py-5 text-sm text-muted-foreground">{state.failure.message}</p>;
  const requiresSignIn = state.catalog.authentication === "required";
  return <div>
    {requiresSignIn && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-3">
      <p role="status" className="text-xs text-muted-foreground">Sign in to {provider.label} in Settings → Providers, then refresh. Your draft is preserved.</p>
      {onOpenProviderSettings && <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenProviderSettings}>Sign in</Button>}
    </div>}
    {!state.catalog.models.length && <p className="px-3 py-5 text-sm text-muted-foreground">This runtime has no available models.</p>}
    <div role="group" aria-label={`${provider.label} models`} className="space-y-1">
      {state.catalog.models.map((model) => {
        const ref = { kind: provider.kind, instanceId: provider.instanceId, model: model.id };
        const favorite = isFavoriteModel(favorites.models, ref);
        return <NativeModelRow key={model.id} label={model.name || model.id} description={model.description}
          selected={nativeProviderKey(provider) === selectedProviderKey && model.id === selectedModelId} disabled={locked || requiresSignIn}
          favorite={favorite} favoriteDisabled={!!favorites.pending && sameModel(favorites.pending, ref)}
          onSelect={() => onSelect(model)} onFavorite={(value) => favorites.toggle(ref, value)} />;
      })}
    </div>
  </div>;
}
