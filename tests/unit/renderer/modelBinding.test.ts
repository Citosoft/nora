import assert from "node:assert/strict";
import test from "node:test";
import { resolveModelBinding, selectedNativeModel } from "@/components/app/logic/modelBinding";
import type { ModelBindingInput } from "@/components/app/types/modelPicker.types";
import { codexProvider, claudeProvider, pickerCatalog } from "./modelPickerFixtures";

function selection(): ModelBindingInput {
  return { provider: codexProvider, catalog: pickerCatalog(), modelId: "first", policyId: "read", reasoning: "high", locked: null };
}

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
