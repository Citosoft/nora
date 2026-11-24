import assert from "node:assert/strict";
import test from "node:test";
import { favoriteModelRows } from "@/components/app/logic/favoriteModelRows";
import { nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
import type { ModelCatalogState } from "@/components/app/types/modelPicker.types";
import { codexProvider, pickerCatalog } from "./modelPickerFixtures";

test("favourite rows keep saved order and explain missing providers, loading catalogs and withdrawn models", () => {
  const favorites = [{ kind: "codex" as const, instanceId: codexProvider.instanceId, model: "first" },
    { kind: "codex" as const, instanceId: codexProvider.instanceId, model: "gone" },
    { kind: "claude" as const, instanceId: "elsewhere", model: "opus" }];
  const loaded = favoriteModelRows(favorites, [codexProvider], (key) => key === nativeProviderKey(codexProvider) ? pickerCatalog() : { status: "idle" });
  assert.deepEqual(loaded.map((row) => row.status), ["ready", "unavailable", "unavailable"]);
  assert.equal(loaded[0]?.status === "ready" && loaded[0].model.id, "first");
  assert.match(loaded[1]?.status === "unavailable" ? loaded[1].reason : "", /no longer offers/);
  assert.match(loaded[2]?.status === "unavailable" ? loaded[2].reason : "", /isn't installed/);
  const loading: ModelCatalogState = { status: "loading" };
  assert.equal(favoriteModelRows(favorites.slice(0, 1), [codexProvider], () => loading)[0]?.status, "loading");
});
