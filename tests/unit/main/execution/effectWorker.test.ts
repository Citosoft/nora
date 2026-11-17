import assert from "node:assert/strict";
import test from "node:test";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { fixture } from "./fixture";
import { ProviderDouble } from "./providerDouble";

test("workspace verification failure pauses the queue before invoking a native provider", async (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("queued");
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  const worker = new EffectWorker(f.engine, providers, f.engine.accept.bind(f.engine), async () => { throw new Error("path containing private details"); });
  assert.equal(await worker.runNext(), true);
  assert.equal(provider.starts, 0); assert.equal(f.snapshot().runs[0].state, "failed");
  assert.equal(f.snapshot().runs[0].failure?.code, "host"); assert.equal(f.snapshot().conversation.queuePaused, true);
  assert.equal(f.snapshot().runs[1].state, "queued"); assert.equal(f.snapshot().runs[0].failure?.message.includes("private"), false);
});

test("interrupt while workspace verification awaits cannot send the instruction after the check returns", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const providers = new ProviderRegistry(); const provider = new ProviderDouble(); providers.register(provider);
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const worker = new EffectWorker(f.engine, providers, f.engine.accept.bind(f.engine), () => gate);
  const operation = worker.beginNextEffect(["start"]); assert.ok(operation);
  f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
  // The native interrupt cannot find an owner because preflight has not submitted anything.
  await worker.runNext(["interrupt"]);
  release(); await operation;
  assert.equal(provider.starts, 0); assert.equal(f.snapshot().runs[0].state, "interrupted");
  assert.equal(f.snapshot().conversation.queuePaused, true);
  await worker.runNext(["review"]);
  assert.equal(f.store.unfinishedEffects().length, 0);
});
