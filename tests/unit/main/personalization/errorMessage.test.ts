import assert from "node:assert/strict";
import test from "node:test";
import { ExecutionCommandError } from "@main/execution/errors";
import { personalizationErrorMessage } from "@main/personalization/errorMessage";

test("a closed runtime reports recovery instructions instead of a setup storage failure", () => {
  const error = Object.assign(new Error("database is not open"), { code: "ERR_INVALID_STATE" });
  assert.match(personalizationErrorMessage(error, "boot"), /Quit Nora and open it again/);
  assert.match(personalizationErrorMessage(error, "onboard"), /execution host is no longer available/);
  assert.doesNotMatch(personalizationErrorMessage(new Error("Failed"), "boot"), /save this setup/);
});

test("workspace validation remains actionable and setup failures preserve the retry guidance", () => {
  const error = new ExecutionCommandError("conflict", "Workspace identity changed; review the checkout");
  assert.equal(personalizationErrorMessage(error, "register-workspace"), error.message);
  assert.match(personalizationErrorMessage(new Error("Storage failed"), "onboard"), /your selection is preserved/);
});
