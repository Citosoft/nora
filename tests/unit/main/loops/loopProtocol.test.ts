import { buildReviewerPrompt, buildWriterPrompt } from "@main/loops/loopProtocol";
import type { LoopDefinition, LoopRunRole } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1", projectId: "project-1", name: "Delivery", description: "",
  stages: [{ id: "writer", kind: "writer", name: "Writer", toolId: "codex", model: null, instructions: "Implement carefully." }, { id: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", model: null, instructions: "Find regressions." }],

  limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 },
  createdAt: "2026-06-09T00:00:00.000Z", updatedAt: "2026-06-09T00:00:00.000Z"
};

const writer: LoopRunRole = { roleId: "writer", kind: "writer", name: "Writer", toolId: "codex", model: null, instructions: "Implement carefully." };
const reviewer: LoopRunRole = { roleId: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", model: null, instructions: "Find regressions." };

test("writer and reviewer prompts constrain their outcome vocabularies", () => {
  const goal = { objective: "Deliver feature", specPath: null, taskPath: null, handoffPath: null };
  const writerPrompt = buildWriterPrompt(definition, writer, goal, undefined, "token-1");
  const reviewerPrompt = buildReviewerPrompt(definition, reviewer, goal, "Implemented", "token-2");
  assert.match(writerPrompt, /outcome: one of continue\|complete/);
  assert.match(reviewerPrompt, /outcome: one of approve\|changes_requested/);
  assert.match(reviewerPrompt, /Do not edit files/);
  assert.match(writerPrompt, /report_workflow_stage/);
  assert.match(writerPrompt, /attempt_id: "token-1"/);
});

test("writer and reviewer prompts include spec guidance when configured", () => {
  const goal = { objective: "", specPath: ".nora/specs/feature.md", taskPath: null, handoffPath: null };
  const writerPrompt = buildWriterPrompt(definition, writer, goal, undefined, "token-1");
  assert.match(writerPrompt, /Spec \(source of truth\)/);
  assert.match(writerPrompt, /\.nora\/specs\/feature\.md/);
});

test("writer and reviewer prompts include the workflow description only when set", () => {
  const goal = { objective: "Deliver feature", specPath: null, taskPath: null, handoffPath: null };
  assert.doesNotMatch(buildWriterPrompt(definition, writer, goal, undefined, "token-1"), /Workflow purpose/);
  const described = { ...definition, description: "Harden payment flows." };
  assert.match(buildWriterPrompt(described, writer, goal, undefined, "token-1"), /Workflow purpose: Harden payment flows\./);
  assert.match(buildReviewerPrompt(described, reviewer, goal, "Implemented", "token-2"), /Workflow purpose: Harden payment flows\./);
});
