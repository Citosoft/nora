import assert from "node:assert/strict";
import test from "node:test";
import { FAVORITE_MODELS_MAX } from "@shared/personalization/contracts";
import { isFavoriteModel, withFavoriteModel } from "@shared/personalization/favoriteModels";

const opus = { kind: "claude" as const, instanceId: "local", model: "opus" };
const gpt = { kind: "codex" as const, instanceId: "local", model: "gpt" };

test("favourites add at the end, keep their place when re-added and tell accounts apart", () => {
  const added = withFavoriteModel(withFavoriteModel([], opus, true), gpt, true);
  assert.deepEqual(added, [opus, gpt]);
  assert.deepEqual(withFavoriteModel(added, opus, true), [opus, gpt]);
  assert.equal(isFavoriteModel(added, { ...opus, instanceId: "work" }), false);
  assert.deepEqual(withFavoriteModel(added, opus, false), [gpt]);
  assert.deepEqual(withFavoriteModel(added, { ...opus, model: "missing" }, false), [opus, gpt]);
});

test("favourites refuse to grow past the limit but can still be removed there", () => {
  const full = Array.from({ length: FAVORITE_MODELS_MAX }, (_, index) => ({ ...opus, model: `m${index}` }));
  assert.throws(() => withFavoriteModel(full, gpt, true), /up to/);
  assert.equal(withFavoriteModel(full, full[0]!, false).length, FAVORITE_MODELS_MAX - 1);
});
