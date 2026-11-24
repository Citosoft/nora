import { FAVORITE_MODELS_MAX } from "./contracts";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";

/** A favourite names one model on one provider account; the same model on another account is a separate favourite. */
export function sameModel(a: ThreadModelDefault, b: ThreadModelDefault): boolean {
  return a.kind === b.kind && a.instanceId === b.instanceId && a.model === b.model;
}

export function isFavoriteModel(favorites: readonly ThreadModelDefault[], model: ThreadModelDefault): boolean {
  return favorites.some((entry) => sameModel(entry, model));
}

/** Adds a model at the end of the favourites or removes it; adding one that is already there keeps its place. */
export function withFavoriteModel(favorites: readonly ThreadModelDefault[], model: ThreadModelDefault, favorite: boolean): ThreadModelDefault[] {
  const others = favorites.filter((entry) => !sameModel(entry, model));
  if (!favorite) return others;
  if (others.length < favorites.length) return [...favorites];
  if (favorites.length >= FAVORITE_MODELS_MAX) throw new Error(`You can keep up to ${FAVORITE_MODELS_MAX} favourite models. Remove one first.`);
  return [...favorites, { kind: model.kind, instanceId: model.instanceId, model: model.model }];
}
