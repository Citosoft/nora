import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { fixture } from "./fixture";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import type { ExecutionProvider } from "@main/types/execution/provider.types";
import type { SteeringResult } from "@main/types/execution/steering.types";

function setup(t: TestContext, steer: NonNullable<ExecutionProvider["steer"]> = async () => ({ status: "accepted" })) {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "started", eventId: "started", nativeConversationId: "thread", nativeTurnId: "turn" });
  f.submit("queued");
  const provider: ExecutionProvider = { kind: "codex", instanceId: "account-a", capabilities: { ...nativeCapabilities, steering: true },
    steer, async start() {}, async interrupt() {}, async respond() {}, async reconcile() {}, async close() {},
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "No catalog in this test", retryable: false } }; } };
  const registry = new ProviderRegistry(); registry.register(provider);
  const worker = new EffectWorker(f.engine, registry);
  const command = { kind: "steer-queued" as const, commandId: "steer", conversationId: "conversation", runId: "queued", targetRunId: "run" };
  return { f, worker, command };
}

test("preferred steering is admitted atomically with submission and preserves retry identity", (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "started", eventId: "start", nativeConversationId: "thread", nativeTurnId: "turn" });
  const command = { kind: "submit" as const, commandId: "follow-up", conversationId: "conversation", runId: "follow-up", instruction: "Focus here" };
  const receipt = f.engine.execute(command, { steerFollowUp: true });
  assert.equal(f.snapshot().runs[1].steering, "pending");
  assert.equal(f.store.unfinishedEffects().filter((effect) => effect.action.kind === "steer").length, 1);
  assert.deepEqual(f.engine.execute(command, { steerFollowUp: false }), receipt);
  assert.equal(f.store.unfinishedEffects().filter((effect) => effect.action.kind === "steer").length, 1);
});

test("preferred steering falls back to the queue when there is no confirmed active turn", (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.engine.execute({ kind: "submit", commandId: "follow-up", conversationId: "conversation", runId: "follow-up", instruction: "Next" },
    { steerFollowUp: true });
  assert.equal(f.snapshot().runs[1].state, "queued"); assert.equal(f.snapshot().runs[1].steering, undefined);
});

test("steering consumes a queued message only after acknowledgement and retries never deliver twice", async (t) => {
  let calls = 0;
  const { f, worker, command } = setup(t, async (_execution, instruction) => { calls++; assert.equal(instruction, "queued"); return { status: "accepted" }; });
  const receipt = f.command(command);
  assert.equal(f.snapshot().runs.find((run) => run.id === "queued")?.steering, "pending");
  assert.throws(() => f.command({ kind: "remove-queued", commandId: "remove", conversationId: "conversation", runId: "queued" }), /Confirm steering/);
  await worker.runNext(["steer"]);
  assert.equal(f.snapshot().runs.length, 1);
  assert.equal(f.snapshot().runs[0].id, "run");
  assert.ok(f.snapshot().items.some((item) => item.kind === "message" && item.role === "user" && item.text === "queued" && item.runId === "run"));
  assert.deepEqual(f.command(command), receipt);
  assert.equal(await worker.runNext(["steer"]), false); assert.equal(calls, 1);
});

test("rejected steering retains the queued message; uncertain steering never auto-runs as another turn", async (t) => {
  for (const status of ["rejected", "unconfirmed"] as const) await t.test(status, async (t) => {
    const { f, worker, command } = setup(t, async () => ({ status, message: "Delivery result" }));
    f.command(command); await worker.runNext(["steer"]);
    const queued = f.snapshot().runs.find((run) => run.id === "queued"); assert.ok(queued);
    assert.equal(queued.steering, status === "unconfirmed" ? "unconfirmed" : undefined);
    assert.equal(f.snapshot().conversation.queuePaused, true);
    f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
    if (status === "unconfirmed") {
      f.command({ kind: "continue-queue", commandId: "continue", conversationId: "conversation" });
      assert.equal(f.snapshot().runs.find((run) => run.id === "queued")?.state, "queued");
      assert.throws(() => f.command({ ...command, commandId: "retry-uncertain" }), /confirmed running turn/);
    }
  });
});

test("a turn finishing before steering is claimed leaves the message queued", async (t) => {
  let calls = 0; const { f, worker, command } = setup(t, async () => { calls++; return { status: "accepted" }; });
  f.command(command);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  await worker.runNext(["steer"]);
  assert.equal(calls, 0); assert.equal(f.snapshot().runs.find((run) => run.id === "queued")?.steering, undefined);
  assert.equal(f.snapshot().conversation.queuePaused, true);
});

test("acknowledgement racing turn completion cannot replay the steered message and resumes remaining queue", async (t) => {
  let resolve: (result: SteeringResult) => void = () => { throw new Error("Steering has not started"); };
  const { f, worker, command } = setup(t, () => new Promise((done) => { resolve = done; }));
  f.submit("next"); f.command(command);
  const work = worker.runNext(["steer"]);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  assert.equal(f.snapshot().runs.find((run) => run.id === "next")?.state, "queued");
  resolve({ status: "accepted" }); await work;
  assert.equal(f.snapshot().runs.some((run) => run.id === "queued"), false);
  assert.equal(f.snapshot().runs.find((run) => run.id === "next")?.state, "starting");
});

test("restart does not replay claimed steering or discard an unsent steering message", async (t) => {
  for (const claimed of [false, true]) await t.test(String(claimed), (t) => {
    const { f, command } = setup(t); f.command(command);
    if (claimed) assert.ok(f.engine.claimEffect(["steer"]));
    f.restart(); f.engine.recover();
    const queued = f.snapshot().runs.find((run) => run.id === "queued"); assert.ok(queued);
    assert.equal(queued.steering, claimed ? "unconfirmed" : undefined);
    assert.equal(f.store.unfinishedEffects().some((effect) => effect.action.kind === "steer"), false);
    assert.equal(f.snapshot().conversation.queuePaused, true);
  });
});
