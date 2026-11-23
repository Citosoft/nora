import assert from "node:assert/strict";
import { test } from "node:test";
import { mobileRemoteSetupMessage, mobileRemoteSetupStep } from "@/components/app/logic/remote-access/mobileSetup";
import type { RemoteAccessStatus, RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";

const view = (patch: Partial<RemoteAccessView> = {}): RemoteAccessView => ({
  signedIn: true, enabled: true, status: { status: "connected" }, runtime: null, webAppUrl: "https://app.example.test", pendingCleanup: false, devices: [], ...patch
});
const enabledWith = (status: RemoteAccessStatus) => mobileRemoteSetupStep(view({ status }));

test("the Mobile page asks to sign in, then to enable, before remote access is on", () => {
  assert.deepEqual(mobileRemoteSetupStep(null), { kind: "loading" });
  assert.deepEqual(mobileRemoteSetupStep(view({ enabled: false, signedIn: false, status: { status: "disabled" } })), { kind: "sign-in" });
  assert.deepEqual(mobileRemoteSetupStep(view({ enabled: false, status: { status: "disabled" } })), { kind: "enable" });
});

test("an enabled runtime shows progress until it connects", () => {
  assert.deepEqual(enabledWith({ status: "connected" }), { kind: "connected" });
  assert.deepEqual(enabledWith({ status: "downloading", progress: 0.42 }), { kind: "starting", label: "Downloading connector…", detail: "42%" });
  assert.deepEqual(enabledWith({ status: "reconnecting", message: "Network lost" }), { kind: "starting", label: "Reconnecting", detail: "Network lost" });
});

test("problems offer the matching recovery", () => {
  assert.deepEqual(enabledWith({ status: "paused", reason: "signed-out" }), { kind: "sign-in" });
  assert.equal(enabledWith({ status: "paused", reason: "different-account" }).kind, "attention");
  assert.deepEqual(enabledWith({ status: "error", message: "Tunnel failed", retryable: true }), { kind: "attention", label: "Needs attention", detail: "Tunnel failed", recovery: "retry" });
  assert.deepEqual(enabledWith({ status: "error", message: "Unsupported", retryable: false }), { kind: "attention", label: "Needs attention", detail: "Unsupported", recovery: null });
});

test("the status line explains each step and stays quiet while loading or connected", () => {
  assert.equal(mobileRemoteSetupMessage({ kind: "loading" }), "");
  assert.equal(mobileRemoteSetupMessage({ kind: "connected" }), "");
  assert.match(mobileRemoteSetupMessage({ kind: "enable" }), /Remote access is off/);
  assert.equal(mobileRemoteSetupMessage({ kind: "starting", label: "Connecting…", detail: null }), "Connecting…");
  assert.equal(mobileRemoteSetupMessage({ kind: "attention", label: "Needs attention", detail: "Tunnel failed", recovery: "retry" }), "Needs attention · Tunnel failed");
});
