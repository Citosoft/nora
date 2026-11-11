import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionCommandError } from "@main/execution/errors";
import { restoreWorkspaceSelection } from "@main/helpers/restoreWorkspaceSelection";

test("stale or missing workspace selections do not abort startup", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  for (const code of ["conflict", "invalid", "missing"] as const) {
    await restoreWorkspaceSelection(async () => {
      throw new ExecutionCommandError(code, "Saved selection needs attention");
    });
  }
  for (const code of ["ENOENT", "ENOTDIR"]) {
    await restoreWorkspaceSelection(async () => {
      throw Object.assign(new Error("Saved folder no longer exists"), { code });
    });
  }
  let restored = false;
  await restoreWorkspaceSelection(async () => { restored = true; });
  assert.equal(restored, true);
  assert.equal(warnings.mock.callCount(), 5);
});

test("unexpected storage and environment failures still propagate", async () => {
  for (const failure of [new Error("Storage unavailable"), new ExecutionCommandError("environment", "Wrong host")]) {
    await assert.rejects(restoreWorkspaceSelection(async () => { throw failure; }), (error) => error === failure);
  }
});
