import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture";

test("post-turn suggestions persist without reopening execution or adding effects", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const run = f.snapshot().runs[0];
  const update = { kind: "prompt-suggestion" as const, eventId: "suggestion", conversationId: "conversation", runId: run.id, attemptId: run.attemptId, suggestion: "Run the tests." };
  f.engine.accept({ ...update, eventId: "early" });
  assert.equal(f.snapshot().runs[0].promptSuggestion, undefined);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const effects = f.store.effects().length;
  const completedAt = f.snapshot().runs[0].updatedAt;
  f.setTime("2026-10-21T10:01:00.000Z");
  f.engine.accept(update);
  assert.equal(f.snapshot().runs[0].state, "completed");
  assert.equal(f.snapshot().runs[0].updatedAt, completedAt);
  assert.equal(f.store.effects().length, effects);
  f.restart();
  assert.equal(f.snapshot().runs[0].promptSuggestion, "Run the tests.");
  f.engine.accept({ ...update, eventId: "replacement", suggestion: "Different prompt" });
  assert.equal(f.snapshot().runs[0].promptSuggestion, "Run the tests.");
});

for (const status of ["failed", "interrupted"] as const) {
  test(`suggestions are ignored after a ${status} turn`, (t) => {
    const f = fixture(t); f.create(); f.submit();
    const run = f.snapshot().runs[0];
    f.update({ kind: "finished", eventId: "done", status, failure: null, usage: null });
    f.engine.accept({ kind: "prompt-suggestion", eventId: "suggestion", conversationId: "conversation", runId: run.id, attemptId: run.attemptId, suggestion: "Try again" });
    assert.equal(f.snapshot().runs[0].promptSuggestion, undefined);
  });
}

test("an incorrect execution attempt cannot attach a suggestion", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const run = f.snapshot().runs[0];
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.engine.accept({ kind: "prompt-suggestion", eventId: "suggestion", conversationId: "conversation", runId: run.id, attemptId: "stale", suggestion: "Try again" });
  assert.equal(f.snapshot().runs[0].promptSuggestion, undefined);
});
