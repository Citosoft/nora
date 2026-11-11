import assert from "node:assert/strict";
import test from "node:test";
import { createAppShutdown } from "@main/helpers/appShutdown";

test("app shutdown waits for runtime cleanup once before allowing the final quit", async () => {
  let finishCleanup = (): void => {};
  const cleanup = new Promise<void>((resolve) => { finishCleanup = resolve; });
  let didQuit = (): void => {};
  const quit = new Promise<void>((resolve) => { didQuit = resolve; });
  let shutdowns = 0;
  let quits = 0;
  let prevented = 0;
  const lifecycle = createAppShutdown({
    async shutdown() { shutdowns += 1; await cleanup; },
    quit() { quits += 1; didQuit(); },
    onFailure(message) { assert.fail(message); }
  });
  const event = { preventDefault() { prevented += 1; } };
  assert.equal(lifecycle.isQuitting(), false);
  assert.equal(shutdowns, 0);
  lifecycle.beforeQuit(event);
  lifecycle.beforeQuit(event);
  assert.equal(lifecycle.isQuitting(), true);
  assert.equal(shutdowns, 1);
  assert.equal(quits, 0);
  assert.equal(prevented, 2);

  finishCleanup();
  await quit;
  lifecycle.beforeQuit(event);
  assert.equal(prevented, 2);
  assert.equal(quits, 1);
});

test("cleanup failures are reported and do not trap the app in a quit loop", async () => {
  const failures: string[] = [];
  let didQuit = (): void => {};
  const quit = new Promise<void>((resolve) => { didQuit = resolve; });
  const lifecycle = createAppShutdown({
    async shutdown() { throw new Error("Runtime cleanup failed"); },
    quit: () => didQuit(),
    onFailure: (message) => failures.push(message)
  });
  lifecycle.beforeQuit({ preventDefault() {} });
  await quit;
  assert.deepEqual(failures, ["Runtime cleanup failed"]);
  lifecycle.beforeQuit({ preventDefault() { assert.fail("Final quit must be allowed"); } });
});
