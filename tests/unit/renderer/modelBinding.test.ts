import assert from "node:assert/strict";
import test from "node:test";
import { inheritedModelId, inheritedSubagentModel, inheritedNativeProvider, resolveModelBinding, selectedNativeModel } from "@/components/app/logic/modelBinding";
import type { ModelBindingInput } from "@/components/app/types/modelPicker.types";
import { codexProvider, claudeProvider, pickerCatalog } from "./modelPickerFixtures";

function selection(): ModelBindingInput {
  return { provider: codexProvider, catalog: pickerCatalog(), modelId: "first", policyId: "read", reasoning: "high", subagentModel: null, locked: null };
}

test("default subagent models apply only to matching capable providers with an available model", () => {
  const catalog = pickerCatalog();
  const preferred = { ...codexProvider, model: "second" };
  assert.equal(inheritedSubagentModel(catalog, codexProvider, preferred), null);
  catalog.catalog.capabilities.subagentModel = true;
  assert.equal(inheritedSubagentModel(catalog, codexProvider, preferred), "second");
  assert.equal(inheritedSubagentModel(catalog, claudeProvider, preferred), null);
  assert.equal(inheritedSubagentModel(catalog, codexProvider, { ...preferred, model: "removed" }), null);
});

test("bindings use advertised model/policy/reasoning and never silently substitute an explicit choice", () => {
  const input = selection(); const ready = resolveModelBinding(input);
  assert.equal(ready.status, "ready");
  if (ready.status === "ready") assert.deepEqual(ready.binding, { kind: "codex", instanceId: "account", model: "first", permissionPolicy: "read", reasoning: "high" });
  assert.equal(selectedNativeModel(input.catalog, null)?.id, "first");
  assert.equal(selectedNativeModel(input.catalog, "removed"), null);
  for (const changed of [{ modelId: "removed" }, { policyId: "missing" }, { policyId: null }, { modelId: "second", reasoning: "high" }]) {
    assert.equal(resolveModelBinding({ ...input, ...changed }).status, "blocked");
  }
  assert.equal(resolveModelBinding({ ...input, modelId: "second", reasoning: null }).status, "ready");
});

test("missing/auth-required/incorrect catalogs block sending and never change a locked thread binding", () => {
  const input = selection(); const catalog = pickerCatalog(); catalog.catalog.authentication = "required";
  assert.equal(resolveModelBinding({ ...input, catalog }).status, "blocked");
  assert.equal(resolveModelBinding({ ...input, catalog: { status: "loading" } }).status, "blocked");
  assert.equal(resolveModelBinding({ ...input, provider: claudeProvider }).status, "blocked");
  const locked = { kind: "codex" as const, instanceId: "account", model: "first", permissionPolicy: "write", reasoning: null };
  const result = resolveModelBinding({ ...input, locked, modelId: "second", policyId: "read", reasoning: "high" });
  assert.equal(result.status, "ready"); if (result.status === "ready") assert.equal(result.binding, locked);
  assert.equal(resolveModelBinding({ ...input, locked: { ...locked, model: "removed" } }).status, "blocked");
});

test("a subagent model binds only when the runtime accepts one and offers that model", () => {
  const input = selection();
  assert.equal(resolveModelBinding({ ...input, subagentModel: "second" }).status, "blocked", "runtimes without the capability reject it");
  const catalog = pickerCatalog(); catalog.catalog.capabilities.subagentModel = true;
  const ready = resolveModelBinding({ ...input, catalog, subagentModel: "second" });
  assert.equal(ready.status, "ready"); if (ready.status === "ready") assert.equal(ready.binding.subagentModel, "second");
  assert.equal(resolveModelBinding({ ...input, catalog, subagentModel: "removed" }).status, "blocked");
  const unset = resolveModelBinding({ ...input, catalog });
  assert.ok(unset.status === "ready" && !("subagentModel" in unset.binding), "no choice leaves the runtime default");
});

test("new threads inherit the configured default provider and model, falling back when either is unavailable", () => {
  const preferred = { kind: "claude" as const, instanceId: "account", model: "second" };
  assert.equal(inheritedNativeProvider([codexProvider, claudeProvider], preferred), claudeProvider);
  assert.equal(inheritedNativeProvider([codexProvider, claudeProvider], null), codexProvider);
  assert.equal(inheritedNativeProvider([codexProvider], preferred), codexProvider, "an uninstalled default falls back to the first provider");
  assert.equal(inheritedNativeProvider([], preferred), null);
  const claudeCatalog = pickerCatalog(claudeProvider);
  assert.equal(inheritedModelId(claudeCatalog, claudeProvider, preferred), "second");
  assert.equal(selectedNativeModel(claudeCatalog, inheritedModelId(claudeCatalog, claudeProvider, { ...preferred, model: "removed" }))?.id, "first",
    "a removed default model falls back to the first model");
  assert.equal(inheritedModelId(pickerCatalog(), codexProvider, preferred), null, "the default model applies only to its own provider");
  assert.equal(inheritedModelId({ status: "loading" }, claudeProvider, preferred), null);
});
