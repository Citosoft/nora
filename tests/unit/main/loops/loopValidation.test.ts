import { normalizeLoopDefinition } from "@main/loops/loopValidation";
import type { SaveLoopDefinitionPayload } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function payload(): SaveLoopDefinitionPayload {
  return {
    projectId: "project-1",
    definition: {
      id: "loop-1", name: " Loop ",
      writer: { id: "writer", kind: "writer", name: " Writer ", toolId: "codex", instructions: " Implement " },
      reviewers: [], limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 }
    }
  };
}

test("normalizeLoopDefinition trims fields and assigns timestamps", () => {
  const result = normalizeLoopDefinition(payload(), "2026-06-09T10:00:00.000Z");
  assert.equal(result.name, "Loop");
  assert.equal(result.writer.name, "Writer");
  assert.equal(result.createdAt, "2026-06-09T10:00:00.000Z");
});

test("normalizeLoopDefinition rejects duplicate roles and invalid limits", () => {
  const duplicate = payload();
  duplicate.definition.reviewers = [{ id: "writer", kind: "reviewer", name: "Review", toolId: "claude", instructions: "Review" }];
  assert.throws(() => normalizeLoopDefinition(duplicate, "now"), /unique/);
  const invalid = payload();
  invalid.definition.limits.maxIterations = 0;
  assert.throws(() => normalizeLoopDefinition(invalid, "now"), /between 1 and 100/);
});

test("normalizeLoopDefinition accepts payloads without a template objective", () => {
  const withoutObjective = payload();
  assert.doesNotThrow(() => normalizeLoopDefinition(withoutObjective, "now"));
});
