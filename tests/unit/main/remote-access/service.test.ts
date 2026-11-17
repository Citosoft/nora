import assert from "node:assert/strict";
import test from "node:test";
import { serviceFixture } from "./serviceFixture";
import type { ProvisionRuntimeResponse } from "@shared/types/remote-access/directory.types";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("remote access is off by default; enable owns transports and shutdown preserves the opt-in", async () => {
  const f = serviceFixture(); await f.service.start();
  assert.equal(f.service.isEnabled(), false); assert.equal(f.counts().started, 0);
  await f.service.enable();
  assert.equal(f.service.view().status.status, "connected"); assert.equal(f.permits(), true);
  assert.equal(f.state().connectorSecret, "encrypted:connector-token");
  assert.equal(f.state().port, 43210);
  await f.service.shutdown(); assert.equal(f.permits(), false);
  assert.equal(f.state().enabled, true);
  assert.equal(f.counts().serverClosed, 1); assert.equal(f.counts().connectorStopped, 1);
  const resumed = serviceFixture(f.state()); await resumed.service.start();
  assert.equal(resumed.counts().provisioned, 0); assert.equal(resumed.service.view().status.status, "connected");
  await resumed.service.shutdown();
});

test("offline disable revokes locally and persists cleanup for the owner to retry", async () => {
  const f = serviceFixture(undefined, { async remove() { throw new Error("Offline"); } });
  await f.service.start(); await f.service.enable();
  const disabled = f.service.disable(); assert.equal(f.permits(), false); assert.equal(f.service.isEnabled(), false);
  await disabled;
  assert.equal(f.service.view().pendingCleanup, true); assert.equal(f.state().connectorSecret, null);
  assert.equal(f.counts().serverClosed, 1); assert.equal(f.counts().connectorStopped, 1);
  await f.service.shutdown();
  const resumed = serviceFixture(f.state()); await resumed.service.start();
  assert.equal(resumed.counts().removed, 1); assert.equal(resumed.service.view().pendingCleanup, false);
  assert.equal(resumed.counts().started, 0); await resumed.service.shutdown();
});

test("sign-out or switching accounts pauses immediately; only the stored owner resumes", async () => {
  const f = serviceFixture(); await f.service.start(); await f.service.enable();
  f.setSession(null); f.service.sessionChanged(); assert.equal(f.permits(), false);
  await tick(); assert.deepEqual(f.service.view().status, { status: "paused", reason: "signed-out" });
  f.setSession({ userId: "another-account", sessionId: "session-b" }); f.service.sessionChanged(); await tick();
  assert.deepEqual(f.service.view().status, { status: "paused", reason: "different-account" });
  assert.equal(f.counts().started, 1);
  f.setSession({ userId: "owner", sessionId: "session-c" }); f.service.sessionChanged(); await tick();
  assert.equal(f.service.view().status.status, "connected"); assert.equal(f.permits(), true);
  assert.equal(f.counts().provisioned, 1); assert.equal(f.counts().started, 2);
  await f.service.shutdown();
});

test("disable during provisioning cannot resurrect a late tunnel or write its token", async () => {
  let finish = (_value: ProvisionRuntimeResponse): void => {};
  let entered = (): void => {};
  const waiting = new Promise<void>((resolve) => { entered = resolve; });
  const f = serviceFixture(undefined, { provision: async () => { entered(); return new Promise((resolve) => { finish = resolve; }); } });
  await f.service.start();
  const enable = f.service.enable(); const rejected = assert.rejects(enable, /changed/);
  await waiting;
  const disable = f.service.disable();
  finish({ runtime: f.runtime, connectorToken: "late-secret" });
  await rejected; await disable;
  assert.equal(f.counts().started, 0); assert.equal(f.state().enabled, false);
  assert.equal(f.state().connectorSecret, null); assert.equal(f.permits(), false);
  await f.service.shutdown();
});

test("rotate stops old transports before starting replacement credentials", async () => {
  let rotations = 0;
  const f = serviceFixture(undefined, { async rotate() { rotations += 1; return { runtime: f.runtime, connectorToken: "new-secret" }; } });
  await f.service.start(); await f.service.enable(); await f.service.rotate();
  assert.equal(rotations, 1); assert.equal(f.state().connectorSecret, "encrypted:new-secret");
  assert.equal(f.counts().serverClosed, 1); assert.equal(f.counts().connectorStopped, 1);
  assert.equal(f.counts().started, 2);
  assert.equal((await f.service.rename(" My computer ")).runtime?.name, "My computer");
  await f.service.shutdown();
});

test("cleanup failures keep their actionable cause on enable and retry, then recover when fixed", async () => {
  let offline = true;
  const f = serviceFixture(undefined, { async remove() { if (offline) throw new Error("Sign in again to use account services."); } });
  await f.service.start(); await f.service.enable(); await f.service.disable();
  assert.equal(f.service.view().pendingCleanup, true);
  await assert.rejects(f.service.enable(), /Sign in again/);
  assert.deepEqual(f.service.view().status, { status: "error", message: "Sign in again to use account services.", retryable: true });
  await assert.rejects(f.service.retry(), /Sign in again/);
  assert.equal(f.service.view().pendingCleanup, true);
  assert.equal(f.service.isEnabled(), false);
  offline = false;
  await f.service.retry();
  assert.equal(f.service.view().pendingCleanup, false);
  assert.equal(f.service.view().status.status, "disabled");
  await f.service.enable();
  assert.equal(f.service.view().status.status, "connected");
  await f.service.shutdown();
});
