import assert from "node:assert/strict";
import test from "node:test";
import { presentRemoteStatus, validateRuntimeName, formatRemoteActivity } from "@/components/app/logic/remote-access/presentation";

test("remote status describes pause, progress and errors", () => {
  assert.equal(presentRemoteStatus({ status: "connected" }).tone, "success");
  assert.equal(presentRemoteStatus({ status: "paused", reason: "different-account" }).detail, "Sign in with the account that set this up.");
  assert.equal(presentRemoteStatus({ status: "downloading", progress: 0.42 }).detail, "42%");
  assert.equal(presentRemoteStatus({ status: "error", message: "Offline", retryable: true }).detail, "Offline");
});
test("runtime rename uses the shared trimmed length constraints", () => {
  for (const name of ["", "   ", "x".repeat(65)]) assert.ok(validateRuntimeName(name));
  for (const name of ["Nora", " x ", "x".repeat(64)]) assert.equal(validateRuntimeName(name), null);
});
test("remote audit display contains plain action and outcome", () => {
  assert.equal(formatRemoteActivity({ at: "2026-11-16T00:00:00Z", action: "send-message", conversationId: "c", targetId: null, outcome: "rejected", code: "forbidden", userId: "u", sessionId: null }), "Sent a message · Rejected");
});
