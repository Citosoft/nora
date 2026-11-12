import assert from "node:assert/strict";
import test from "node:test";
import { summarizeThreadSubagents } from "@/components/app/logic/thread-workspace/subagents";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

const at = (second: number) => `2026-01-01T00:00:${String(second).padStart(2, "0")}.000Z`;

test("thread subagents merge repeated reports, attach their own tools and list running agents first", () => {
  const items: TimelineItem[] = [
    { id: "a1", runId: "run-1", createdAt: at(1), kind: "subagent", nativeId: "a", label: "Review", state: "running", prompt: "Review the diff" },
    { id: "b1", runId: "run-1", createdAt: at(2), kind: "subagent", nativeId: "b", label: "Tests", state: "running" },
    { id: "t1", runId: "run-1", createdAt: at(3), kind: "tool", label: "Read", output: "", state: "completed", details: { category: "file", parentId: "a" } },
    { id: "t2", runId: "run-1", createdAt: at(4), kind: "tool", label: "Main tool", output: "", state: "completed" },
    { id: "a2", runId: "run-2", createdAt: at(5), kind: "subagent", nativeId: "a", label: "Review", state: "completed", result: "One issue", model: "sonnet" }
  ];
  const summary = summarizeThreadSubagents(items);
  assert.equal(summary.running, 1);
  assert.deepEqual(summary.agents.map((agent) => agent.nativeId), ["b", "a"]);
  const review = summary.agents[1];
  assert.equal(review.state, "completed"); assert.equal(review.result, "One issue");
  assert.equal(review.prompt, "Review the diff", "earlier fields survive later reports");
  assert.equal(review.startedAt, at(1));
  assert.equal(review.model, "sonnet");
  assert.deepEqual(review.activity.map((tool) => tool.id), ["t1"]);
});
