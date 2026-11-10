import assert from "node:assert/strict";
import test from "node:test";
import { createModelCatalogStore, nativeProviderKey } from "@/components/app/logic/modelCatalogStore";
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

test("refresh supersedes a late request without leaking raw discovery failures", async () => {
  const old = deferredCatalog(), newer = deferredCatalog(); let calls = 0;
  const store = createModelCatalogStore({ workspace: pickerWorkspace, client: { async catalog() { return ++calls === 1 ? old.promise : newer.promise; } } });
  const key = nativeProviderKey(codexProvider);
  let events = 0; const unsubscribe = store.subscribe(() => { events++; });
  const first = store.load(codexProvider), refresh = store.load(codexProvider, true);
  const result = pickerCatalog(); result.catalog.models = [];
  newer.resolve(result); await refresh; old.resolve(pickerCatalog()); await first;
  assert.deepEqual(store.get(key), result);
  const before = events; unsubscribe(); await store.load(codexProvider, true); assert.equal(events, before);
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
