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
    confirmQuit: async () => true,
    async shutdown() { shutdowns += 1; await cleanup; },
    quit() { quits += 1; didQuit(); },
    onFailure(message) { assert.fail(message); }
  });
  const event = { preventDefault() { prevented += 1; } };
  assert.equal(lifecycle.isQuitting(), false);
  assert.equal(shutdowns, 0);
  lifecycle.beforeQuit(event);
  lifecycle.beforeQuit(event);
  await Promise.resolve();
  await Promise.resolve();
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
    confirmQuit: async () => true,
    async shutdown() { throw new Error("Runtime cleanup failed"); },
    quit: () => didQuit(),
    onFailure: (message) => failures.push(message)
  });
  lifecycle.beforeQuit({ preventDefault() {} });
  await quit;
  assert.deepEqual(failures, ["Runtime cleanup failed"]);
  lifecycle.beforeQuit({ preventDefault() { assert.fail("Final quit must be allowed"); } });
});

test("cancel returns to running, repeated requests share a prompt, then update confirms once", async () => {
  let answer = (_confirmed: boolean): void => {};
  let prompts = 0;
  let shutdowns = 0;
  const reasons: string[] = [];
  const finished: string[] = [];
  const lifecycle = createAppShutdown({
    confirmQuit(reason) { reasons.push(reason); prompts += 1; return new Promise<boolean>((resolve) => { answer = resolve; }); },
    async shutdown() { shutdowns += 1; },
    quit() { finished.push("quit"); },
    onFailure: assert.fail
  });
  const first = lifecycle.request("quit", () => finished.push("quit"));
  const duplicate = lifecycle.request("quit", () => finished.push("duplicate"));
  assert.equal(first, duplicate);
  assert.equal(prompts, 1);
  assert.equal(lifecycle.isQuitting(), false);
  answer(false);
  assert.equal(await first, false);
  assert.equal(shutdowns, 0);
  const update = lifecycle.request("update", () => finished.push("update"));
  answer(true);
  assert.equal(await update, true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(reasons, ["quit", "update"]);
  assert.equal(shutdowns, 1);
  assert.deepEqual(finished, ["update"]);
  lifecycle.beforeQuit({ preventDefault() { assert.fail("Updater's final quit must pass through"); } });
});
