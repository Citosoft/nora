import { formatAppCrashReport, toAppCrashDetails } from "@/components/app/logic/appCrashReport";
import assert from "node:assert/strict";
import test from "node:test";

test("Error instances keep message, stack, and trimmed component stack", () => {
  const error = new Error("boom");
  const crash = toAppCrashDetails(error, "\n    at Widget\n");

  assert.equal(crash.message, "boom");
  assert.equal(crash.stack, error.stack);
  assert.equal(crash.componentStack, "at Widget");
});

test("non-Error throws fall back to a readable message", () => {
  assert.equal(toAppCrashDetails("bad state").message, "bad state");
  assert.equal(toAppCrashDetails({ nope: true }).message, "Unknown error");
  assert.equal(toAppCrashDetails(undefined).stack, null);
});

test("crash report omits empty sections", () => {
  const report = formatAppCrashReport({ message: "boom", stack: null, componentStack: "at Widget" });

  assert.equal(report, "Error: boom\n\nComponent stack:\nat Widget");
});
