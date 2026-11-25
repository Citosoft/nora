import assert from "node:assert/strict";
import test from "node:test";
import { canForceEndThread, threadStopLabel } from "@/components/app/logic/threadStopControl";

test("force-end is only for jammed stopping or recovering turns", () => {
  assert.equal(canForceEndThread("stopping"), true);
  assert.equal(canForceEndThread("recovering"), true);
  assert.equal(canForceEndThread("running"), false);
  assert.equal(threadStopLabel("stopping"), "End turn");
  assert.equal(threadStopLabel("recovering"), "End turn");
  assert.equal(threadStopLabel("running"), "Stop turn");
});
