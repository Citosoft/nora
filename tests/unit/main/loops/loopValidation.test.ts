import { normalizeLoopDefinition } from "@main/loops/loopValidation";
import type { SaveLoopDefinitionPayload } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function payload(): SaveLoopDefinitionPayload {
  return {
    projectId: "project-1",
    definition: {
      id: "loop-1", name: " Loop ", description: "  Ship features  ",
      stages: [{ id: "writer", kind: "writer", name: " Writer ", toolId: "codex", model: null, instructions: " Implement " }],
       limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 }
    }
  };
}

test("normalizeLoopDefinition trims fields and assigns timestamps", () => {
  const result = normalizeLoopDefinition(payload(), "2026-06-09T10:00:00.000Z");
  assert.equal(result.name, "Loop");
  assert.equal(result.description, "Ship features");
  assert.equal(result.stages[0].name, "Writer");
  assert.equal(result.createdAt, "2026-06-09T10:00:00.000Z");
});

test("normalizeLoopDefinition rejects duplicate roles and invalid limits", () => {
  const duplicate = payload();
  duplicate.definition.stages.push({ id: "writer", kind: "reviewer", name: "Review", toolId: "claude", model: null, instructions: "Review" });
  assert.throws(() => normalizeLoopDefinition(duplicate, "now"), /unique/);
  const invalid = payload();
  invalid.definition.limits.maxIterations = 0;
  assert.throws(() => normalizeLoopDefinition(invalid, "now"), /between 1 and 100/);
});

test("normalizeLoopDefinition accepts payloads without a template objective", () => {
  const withoutObjective = payload();
  assert.doesNotThrow(() => normalizeLoopDefinition(withoutObjective, "now"));
});

test("normalizeLoopDefinition treats a missing description as empty and rejects oversized ones", () => {
  const missing = payload();
  delete (missing.definition as Partial<typeof missing.definition>).description;
  assert.equal(normalizeLoopDefinition(missing, "now").description, "");
  const oversized = payload();
  oversized.definition.description = "x".repeat(2_001);
  assert.throws(() => normalizeLoopDefinition(oversized, "now"), /description is too long/);
});

test("normalizeLoopDefinition normalizes model ids for thread providers", () => {
  const chosen = payload();
  chosen.definition.stages[0].model = " gpt-5-codex ";
  assert.equal(normalizeLoopDefinition(chosen, "now").stages[0].model, "gpt-5-codex");
  const blank = payload();
  blank.definition.stages[0].model = "  ";
  assert.equal(normalizeLoopDefinition(blank, "now").stages[0].model, null);
  const unsupported = payload();
  unsupported.definition.stages[0] = { ...unsupported.definition.stages[0], toolId: "amp", model: "smart" };
  assert.equal(normalizeLoopDefinition(unsupported, "now").stages[0].model, "smart");
});

test("rework destinations must refer to preceding work stages", () => {
  const input = payload();
  input.definition.stages.push({ id: "review", kind: "reviewer", name: "Review", toolId: "claude", model: null, instructions: "Inspect", reworkStageId: "writer" });
  assert.equal(normalizeLoopDefinition(input, "now").stages[1].reworkStageId, "writer");
  input.definition.stages[1].reworkStageId = "missing";
  assert.throws(() => normalizeLoopDefinition(input, "now"), /rework destination/);
  input.definition.stages[1].reworkStageId = "review";
  assert.throws(() => normalizeLoopDefinition(input, "now"), /rework destination/);
  input.definition.stages[1].toolId = "goose";
  assert.throws(() => normalizeLoopDefinition(input, "now"), /read-only mode/);
});
