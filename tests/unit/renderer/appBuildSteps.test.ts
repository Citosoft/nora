import assert from "node:assert/strict";
import test from "node:test";
import { appBuildPhase, buildStepLine } from "@/components/app/logic/apps/buildSteps";
import type { AppBuilderRun } from "@/components/app/logic/apps/buildSteps";

const run = (state: AppBuilderRun["state"], failure: AppBuilderRun["failure"] = null): AppBuilderRun =>
  ({ id: "r", state, createdAt: "2026-11-19T00:00:00.000Z", updatedAt: "2026-11-19T00:00:01.000Z", failure });

test("the builder is building while a turn runs or is being delivered, ready when it finished with an app, and failed otherwise", () => {
  assert.deepEqual(appBuildPhase(null, true, false), { kind: "building" });
  assert.deepEqual(appBuildPhase(run("running"), false, false), { kind: "building" });
  assert.deepEqual(appBuildPhase(run("queued"), false, true), { kind: "building" });
  assert.deepEqual(appBuildPhase(run("completed"), false, true), { kind: "ready" });
  assert.deepEqual(appBuildPhase(run("awaiting-approval"), false, true), { kind: "attention" });
  assert.deepEqual(appBuildPhase(run("failed", { code: "usage-limit", message: "Claude usage limit reached", retryable: true }), false, true), { kind: "failed", message: "Claude usage limit reached" });
  assert.equal(appBuildPhase(run("completed"), false, false).kind, "failed", "a finished turn with no app is a failed build");
  assert.deepEqual(appBuildPhase(null, false, false), { kind: "building" }, "before the first run is known, keep the scene");
  assert.equal(appBuildPhase(run("stopping"), false, true).kind, "building", "a stop in progress keeps the scene up");
  assert.deepEqual(appBuildPhase(run("interrupted"), false, true), { kind: "ready" }, "stopping a change shows the app as it was");
  assert.match(appBuildPhase(run("interrupted"), false, false).kind === "failed" ? (appBuildPhase(run("interrupted"), false, false) as { message: string }).message : "", /You stopped the build/);
});

test("the narration follows the tools' steps and reads differently for a change", () => {
  const at = "2026-11-19T00:00:00.000Z";
  assert.equal(buildStepLine(null, false), "Thinking about your app…");
  assert.equal(buildStepLine(null, true), "Working out the change…");
  assert.equal(buildStepLine({ threadId: "t", kind: "sample", detail: "HubSpot", at }, false), "Trying HubSpot…");
  assert.equal(buildStepLine({ threadId: "t", kind: "save", at }, true), "Applying the change…");
  assert.equal(buildStepLine({ threadId: "t", kind: "saved", at }, false), "Almost there…");
});
