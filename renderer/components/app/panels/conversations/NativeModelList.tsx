import { LoaderCircle } from "lucide-react";
import { isFavoriteModel, sameModel } from "@shared/personalization/favoriteModels";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelListProps } from "@/components/app/types/modelPicker.types";
import { NativeModelRow } from "./NativeModelRow";

export function NativeModelList({ provider, state, selectedProviderKey, selectedModelId, locked, favorites, onSelect }: ModelListProps) {
  if (!provider) return <p className="px-3 py-5 text-sm text-muted-foreground">No providers are configured. Install and sign in to a supported runtime to choose a model.</p>;
  if (state.status === "idle" || state.status === "loading") return <p role="status" className="flex items-center gap-2 px-3 py-5 text-sm text-muted-foreground"><LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading models…</p>;
  if (state.status === "unavailable") return <p role="alert" className="px-3 py-5 text-sm text-muted-foreground">{state.failure.message}</p>;
  const requiresSignIn = state.catalog.authentication === "required";
  return <div>
    {requiresSignIn && <p role="status" className="mb-2 px-3 text-xs text-muted-foreground">Sign in using this provider's CLI, then refresh. Your draft is preserved.</p>}
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
