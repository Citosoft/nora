import assert from "node:assert/strict";
import test from "node:test";
import { commandFingerprint } from "@main/execution/commandIdentity";
import { fixture } from "./fixture";

test("idempotency compares object meaning while preserving array order", () => {
  assert.equal(commandFingerprint({ answers: { one: ["A"], two: ["B"] } }), commandFingerprint({ answers: { two: ["B"], one: ["A"] } }));
  assert.notEqual(commandFingerprint(["A", "B"]), commandFingerprint(["B", "A"]));
});

test("command IDs are scoped to conversations rather than colliding across projects", (t) => {
  const f = fixture(t); f.create(); f.create("other");
  const first = f.command({ kind: "submit", commandId: "same-id", conversationId: "conversation", runId: "run", instruction: "one" });
  const second = f.command({ kind: "submit", commandId: "same-id", conversationId: "other", runId: "run", instruction: "two" });
  assert.notEqual(first.conversationId, second.conversationId);
  assert.equal(f.snapshot("other").runs[0].instruction, "two");
});
