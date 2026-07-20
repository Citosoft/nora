import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCreateAgentPayload, validateCreateAgentPayload } from "@main/helpers/ipcValidation";
import type { CreateAgentPayload } from "@shared/appTypes";

function basePayload(overrides: Partial<CreateAgentPayload> = {}): CreateAgentPayload {
  return {
    toolId: "codex",
    name: "Named",
    task: "Do the thing",
    commandOverride: "",
    mode: "write",
    target: { kind: "new" },
    ...overrides
  };
}

test("normalizeCreateAgentPayload coerces missing string fields", () => {
  const raw = { ...basePayload(), name: undefined, initialPrompt: undefined } as unknown as CreateAgentPayload;
  const normalized = normalizeCreateAgentPayload(raw);
  assert.equal(normalized.name, "");
  assert.equal(normalized.initialPrompt, "");
});

test("validateCreateAgentPayload accepts empty agent name", () => {
  assert.doesNotThrow(() => {
    validateCreateAgentPayload(normalizeCreateAgentPayload(basePayload({ name: "" })));
  });
});

test("validateCreateAgentPayload rejects empty toolId", () => {
  assert.throws(
    () => validateCreateAgentPayload(normalizeCreateAgentPayload(basePayload({ toolId: "" }))),
    /toolId is required/
  );
});

test("validateCreateAgentPayload accepts empty task", () => {
  assert.doesNotThrow(() => {
    validateCreateAgentPayload(normalizeCreateAgentPayload(basePayload({ task: "" })));
  });
});
