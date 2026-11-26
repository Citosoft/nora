import assert from "node:assert/strict";
import test from "node:test";
import { conversationCommandSchema } from "@shared/conversations/contracts";
import type { ProviderFollowUp } from "@main/types/execution/followUp.types";
import { fixture, provider } from "./fixture";

const usage = { inputTokens: 1, outputTokens: 1 };
const followUp = (followUpId: string, overrides: Partial<ProviderFollowUp> = {}): ProviderFollowUp => ({ conversationId: "conversation",
  provider: { kind: provider.kind, instanceId: provider.instanceId }, nativeConversationId: "native-1", followUpId,
  summary: "Background task finished: Wait for the build", ...overrides });

/** A conversation bound to native session `native-1` whose first turn has finished. */
function settledConversation(t: test.TestContext) {
  const f = fixture(t);
  f.create(); f.submit("run");
  f.update({ kind: "started", eventId: "started", nativeConversationId: "native-1", nativeTurnId: "turn-1" });
  f.update({ kind: "finished", eventId: "finished", status: "completed", failure: null, usage });
  return f;
}

test("a follow-up becomes a background-task run that starts with a milestone, once", (t) => {
  const f = settledConversation(t);
  assert.equal(f.engine.acceptFollowUp(followUp("follow-1")), true);
  const run = f.snapshot().runs.find((entry) => entry.id === "follow-1");
  assert.ok(run);
  assert.equal(run.action, "background-task");
  assert.equal(run.state, "starting");
  assert.equal(run.instruction, "Background task finished: Wait for the build");
  const opening = f.snapshot().items.find((item) => item.id === JSON.stringify(["follow-1", "instruction"]));
  assert.equal(opening?.kind, "milestone");
  assert.equal(f.engine.acceptFollowUp(followUp("follow-1")), true);
  assert.equal(f.snapshot().runs.filter((entry) => entry.id === "follow-1").length, 1);
  assert.throws(() => f.engine.acceptFollowUp(followUp("follow-1", { summary: "Something else" })), /different content/);
});

test("a follow-up is refused when the conversation moved on, is settled or is gone", (t) => {
  const f = settledConversation(t);
  assert.equal(f.engine.acceptFollowUp(followUp("other-session", { nativeConversationId: "native-2" })), false);
  assert.equal(f.engine.acceptFollowUp(followUp("other-provider", { provider: { kind: "claude", instanceId: provider.instanceId } })), false);
  assert.equal(f.engine.acceptFollowUp(followUp("missing", { conversationId: "missing" })), false);
  f.command({ kind: "archive", commandId: "archive", conversationId: "conversation" });
  assert.equal(f.engine.acceptFollowUp(followUp("settled")), false);
  assert.deepEqual(f.snapshot().runs.map((run) => run.id), ["run"]);
});

test("a follow-up waits for the running turn, then starts before messages queued behind it", (t) => {
  const f = settledConversation(t);
  f.submit("second");
  f.update({ kind: "started", eventId: "second-started", nativeConversationId: "native-1", nativeTurnId: "turn-2" }, "second");
  f.submit("third");
  assert.equal(f.engine.acceptFollowUp(followUp("follow-1")), true);
  const state = (id: string) => f.snapshot().runs.find((run) => run.id === id)?.state;
  assert.equal(state("follow-1"), "queued");
  f.update({ kind: "finished", eventId: "second-finished", status: "completed", failure: null, usage }, "second");
  assert.equal(state("follow-1"), "starting");
  assert.equal(state("third"), "queued");
});

test("only the host can create background-task runs; a submitted one is invalid", () => {
  const parsed = conversationCommandSchema.safeParse({ kind: "submit", commandId: "c", conversationId: "conversation", runId: "r",
    instruction: "Background task finished", action: "background-task" });
  assert.equal(parsed.success, false);
});
