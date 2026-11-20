import assert from "node:assert/strict";
import test from "node:test";
import { describeActionOutcome } from "@main/apps/actionOutcome";

const text = (value: string, isError = false) => ({ content: [{ type: "text" as const, text: value }], ...(isError ? { isError } : {}) });

test("prose results are shown as they are, JSON results become a plain summary while the log keeps the full text", () => {
  assert.deepEqual(describeActionOutcome(text("Created ticket T-1 for c1")), { summary: "Created ticket T-1 for c1", full: "Created ticket T-1 for c1", isError: false });
  const json = JSON.stringify({ id: "c4", name: "Ivy Chen", stage: "customer", value: 1500, tags: ["a"], nested: { x: 1 } });
  const outcome = describeActionOutcome(text(json));
  assert.equal(outcome.summary, "Done · id c4 · name Ivy Chen · stage customer");
  assert.equal(outcome.full, json);
  assert.equal(describeActionOutcome(text(JSON.stringify([{ id: 1 }, { id: 2 }]))).summary, "Done · 2 items · id 1");
  assert.deepEqual(describeActionOutcome(text("", true)), { summary: "The action failed.", full: "The action failed.", isError: true });
  assert.equal(describeActionOutcome(text("{not json")).summary, "{not json");
});
