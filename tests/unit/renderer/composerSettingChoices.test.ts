import test from "node:test";
import assert from "node:assert/strict";
import { ShieldAlert, Shield } from "lucide-react";
import { permissionChoices } from "@/components/app/logic/permissionPosture";
import { PROVIDER_REASONING, reasoningChoices } from "@/components/app/logic/reasoningEffort";

test("permission choices flag only full access as a caution and fall back to a plain shield without a posture", () => {
  const choices = permissionChoices([{ id: "ask", label: "Ask", posture: "ask" }, { id: "all", label: "Full access", posture: "full" }, { id: "mode", label: "ACP mode" }]);
  assert.deepEqual(choices.map((choice) => choice.caution), [false, true, false]);
  assert.equal(choices[1]?.icon, ShieldAlert);
  assert.equal(choices[2]?.icon, Shield);
});

test("reasoning choices lead with the provider default and describe known and unknown levels", () => {
  const model = { id: "m", name: "M", description: "", reasoningEfforts: ["low", "xhigh", "turbo"], defaultReasoningEffort: "medium" };
  const choices = reasoningChoices(model);
  assert.deepEqual(choices.map((choice) => [choice.id, choice.label]), [[PROVIDER_REASONING, "Default"], ["low", "Low"], ["xhigh", "Extra high"], ["turbo", "Turbo"]]);
  assert.match(choices[0]?.description ?? "", /medium/);
  assert.equal(choices[3]?.description, undefined);
  assert.deepEqual(reasoningChoices({ ...model, reasoningEfforts: [] }), []);
  assert.deepEqual(reasoningChoices(null), []);
});
