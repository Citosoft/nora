import { useContext, useState } from "react";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { FavoriteModelsState } from "@/components/app/types/modelPicker.types";
import { FavoriteModelsContext } from "@/components/app/context/favoriteModelsContext";

/** Favourite models live in personalization, so every picker on this computer shares them. */
export function useFavoriteModels(): FavoriteModelsState {
  const port = useContext(FavoriteModelsContext);
  if (!port) throw new Error("Favourite models are unavailable");
  const [pending, setPending] = useState<ThreadModelDefault | null>(null);
  const [error, setError] = useState<string | null>(null);
  return {
    models: port.models,
    pending,
    error,
    toggle(model, favorite) {
      setPending(model); setError(null);
      void port.setFavorite(model, favorite)
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Favourite models could not be saved."))
        .finally(() => setPending(null));
    }
  };
}
