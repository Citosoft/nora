import assert from "node:assert/strict";
import test from "node:test";
import { checkoutModelCatalog, createModelCatalogStore, nativeProviderKey, readCheckoutModelCatalog } from "@/components/app/logic/modelCatalogStore";
import { pickerWorkspace, codexProvider, claudeProvider, pickerCatalog, deferredCatalog } from "./modelPickerFixtures";

test("committed and browsing views share discovery while provider kinds and accounts stay isolated", async () => {
  const deferred = deferredCatalog();
  let calls = 0;
  const store = createModelCatalogStore({ workspace: pickerWorkspace, client: { async catalog() { calls++; return deferred.promise; } } });
  const codexKey = nativeProviderKey(codexProvider), claudeKey = nativeProviderKey(claudeProvider);
  assert.notEqual(codexKey, claudeKey);
  assert.notEqual(codexKey, nativeProviderKey({ ...codexProvider, instanceId: "other-account" }));
  const initialOther = store.get(claudeKey);
  const first = store.load(codexProvider), second = store.load(codexProvider);
  assert.equal(first, second); assert.equal(store.get(codexKey).status, "loading");
  deferred.resolve(pickerCatalog()); await first;
  assert.equal(calls, 1); assert.equal(store.get(codexKey).status, "available");
  assert.equal(store.get(claudeKey), initialOther);
  const snapshot = store.get(codexKey); await store.load(codexProvider);
  assert.equal(calls, 1); assert.equal(store.get(codexKey), snapshot);
});

test("refresh keeps the loaded catalog visible and shares an in-flight request", async () => {
  const next = deferredCatalog();
  let calls = 0;
  const initial = pickerCatalog();
  const store = createModelCatalogStore({ workspace: pickerWorkspace, client: { async catalog() { return ++calls === 1 ? initial : next.promise; } } });
  const key = nativeProviderKey(codexProvider);
  await store.load(codexProvider);
  const refresh = store.load(codexProvider, true);
  assert.equal(store.load(codexProvider, true), refresh);
  assert.equal(store.load(codexProvider), refresh);
  assert.equal(store.get(key), initial);
  const result = pickerCatalog();
  result.catalog.models = [];
  next.resolve(result);
  await refresh;
  assert.equal(store.get(key), result);
  assert.equal(calls, 2);
});

test("checkout cache shares equivalent workspace reads without crossing clients or checkouts", async () => {
  let calls = 0;
  const client = { async catalog() { calls++; return pickerCatalog(); } };
  const deps = { client, workspace: pickerWorkspace };
  const original = checkoutModelCatalog(deps);
  const equivalent = { client, workspace: { ...pickerWorkspace } };
  assert.equal(checkoutModelCatalog(equivalent), original);
  assert.notEqual(checkoutModelCatalog({ ...deps, client: { ...client } }), original);
  assert.notEqual(checkoutModelCatalog({ ...deps, workspace: { ...pickerWorkspace, checkoutId: "other" } }), original);
  await Promise.all([original.load(codexProvider), readCheckoutModelCatalog(equivalent, codexProvider)]);
  assert.equal(calls, 1);
});

test("raw model discovery errors stay out of the picker", async () => {
  const key = nativeProviderKey(codexProvider);
  const broken = createModelCatalogStore({ workspace: pickerWorkspace, client: { async catalog() { throw new Error("secret token details"); } } });
  await broken.load(codexProvider);
  const failure = broken.get(key); assert.equal(failure.status, "unavailable");
  if (failure.status === "unavailable") assert.doesNotMatch(failure.failure.message, /secret|token/);
});

test("a catalog for a different provider is rejected and an explicit retry can recover", async () => {
  let wrong = true;
  const store = createModelCatalogStore({ workspace: pickerWorkspace, client: { async catalog() { return pickerCatalog(wrong ? claudeProvider : codexProvider); } } });
  const key = nativeProviderKey(codexProvider);
  await store.load(codexProvider); assert.equal(store.get(key).status, "unavailable");
  wrong = false; await store.load(codexProvider, true); assert.equal(store.get(key).status, "available");
});
