import { describeMainWindowFailure } from "@main/helpers/mainWindowRecovery";
import assert from "node:assert/strict";
import test from "node:test";

test("renderer crashes offer reload then quit", () => {
  const prompt = describeMainWindowFailure({ kind: "process-gone", reason: "crashed", exitCode: 11 });

  assert.ok(prompt);
  assert.deepEqual(prompt.actions, ["reload", "quit"]);
  assert.match(prompt.detail, /crashed, code 11/);
});

test("clean renderer exits do not prompt", () => {
  assert.equal(describeMainWindowFailure({ kind: "process-gone", reason: "clean-exit", exitCode: 0 }), null);
});

test("aborted navigations do not prompt but real load failures do", () => {
  assert.equal(
    describeMainWindowFailure({ kind: "load-failed", errorCode: -3, errorDescription: "ERR_ABORTED", url: "file:///index.html" }),
    null
  );

  const prompt = describeMainWindowFailure({
    kind: "load-failed",
    errorCode: -6,
    errorDescription: "ERR_FILE_NOT_FOUND",
    url: "file:///index.html"
  });
  assert.ok(prompt);
  assert.deepEqual(prompt.actions, ["reload", "quit"]);
});

test("unresponsive windows default to waiting", () => {
  const prompt = describeMainWindowFailure({ kind: "unresponsive" });

  assert.ok(prompt);
  assert.equal(prompt.actions[0], "wait");
});
