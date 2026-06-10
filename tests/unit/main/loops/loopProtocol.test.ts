import { buildReviewerPrompt, buildWriterPrompt, parseLoopResult } from "@main/loops/loopProtocol";
import type { LoopDefinition, LoopRunRole } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1", projectId: "project-1", name: "Delivery",
  writer: { id: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement carefully." },
  reviewers: [{ id: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", instructions: "Find regressions." }],
  limits: { maxIterations: 10, maxDurationMs: 3_600_000, roleTimeoutMs: 60_000 },
  createdAt: "2026-06-09T00:00:00.000Z", updatedAt: "2026-06-09T00:00:00.000Z"
};

const writer: LoopRunRole = { roleId: "writer", kind: "writer", name: "Writer", toolId: "codex", instructions: "Implement carefully." };
const reviewer: LoopRunRole = { roleId: "reviewer", kind: "reviewer", name: "Reviewer", toolId: "claude", instructions: "Find regressions." };

test("parseLoopResult accepts the latest matching token and strips ANSI", () => {
  const output = [
    '<nora-loop-result token="old" outcome="complete">stale</nora-loop-result>',
    '\u001b[32m<nora-loop-result token="turn-1" outcome="continue">needs tests</nora-loop-result>\u001b[0m',
    '<nora-loop-result token="turn-1" outcome="complete">all checks pass</nora-loop-result>'
  ].join("\n");
  assert.deepEqual(parseLoopResult(output, "turn-1"), { outcome: "complete", summary: "all checks pass" });
  assert.equal(parseLoopResult(output, "missing"), null);
});

test("writer and reviewer prompts constrain their outcome vocabularies", () => {
  const goal = { objective: "Deliver feature", specPath: null, taskPath: null, handoffPath: null };
  const writerPrompt = buildWriterPrompt(definition, writer, goal, undefined, "token-1");
  const reviewerPrompt = buildReviewerPrompt(definition, reviewer, goal, "Implemented", "token-2");
  assert.match(writerPrompt, /outcome="continue\|complete"/);
  assert.match(reviewerPrompt, /outcome="approve\|changes_requested"/);
  assert.match(reviewerPrompt, /Do not edit files/);
});

test("writer and reviewer prompts include spec guidance when configured", () => {
  const goal = { objective: "", specPath: ".nora/specs/feature.md", taskPath: null, handoffPath: null };
  const writerPrompt = buildWriterPrompt(definition, writer, goal, undefined, "token-1");
  assert.match(writerPrompt, /Spec \(source of truth\)/);
  assert.match(writerPrompt, /\.nora\/specs\/feature\.md/);
});
