import assert from "node:assert/strict";
import test from "node:test";
import { phonePushNotification, startPhonePushNotifier } from "@main/inbox/phonePush";
import { describeAttention } from "@shared/conversations/attention";
import { snapshotBot } from "@shared/bots/snapshot";
import { PUSH_LIMITS, pushNotificationSchema } from "@shared/remote-access/push";
import type { RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { PushNotification } from "@shared/types/remote-access/push.types";
import type { PhonePushNotifierDeps, PhonePushOutcome } from "@main/types/inbox/phonePush.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";

const NOW = "2026-11-18T12:00:00.000Z";
const approval = (id: string): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a", nativeId: id,
  status: "pending", createdAt: NOW, expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });
const rex = conversation("rex", { title: "Fix the build", bot: snapshotBot(bot("rex")) });
const request = (id: string, snoozedUntil: string | null = null): InboxItem => ({ kind: "request", id, workspaceId: "w", occurredAt: NOW, readAt: null, snoozedUntil,
  conversation: rex, request: approval(id), notice: describeAttention(rex, null, approval(id)) });
const outcome = (id: string, preview: string | null = "All green"): InboxItem => ({ kind: "outcome", id, workspaceId: "w", occurredAt: NOW, readAt: null, snoozedUntil: null,
  conversation: rex, run: { id: "r", state: "completed", createdAt: NOW, updatedAt: NOW, failure: null }, preview });
const workflow: InboxItem = { kind: "workflow", id: "workflow:run", workspaceId: null, occurredAt: NOW, readAt: null, snoozedUntil: null, projectId: "p", runId: "run",
  workflowName: "Ship it", objective: "Ship", status: "paused", stopReason: "A stage failed." };
const alert: InboxItem = { kind: "alert", id: "alert:1", workspaceId: null, occurredAt: NOW, readAt: null, snoozedUntil: null,
  appId: "app", appName: "Uptime", alertId: "a", title: "Site down", detail: null, tier: "needs-you" };

function harness(options: { enabled?: () => boolean; send?: PhonePushNotifierDeps["send"]; initial?: InboxItem[] } = {}) {
  let snapshot: InboxSnapshot = { items: options.initial ?? [] };
  let listener: ((next: InboxSnapshot) => void) | null = null;
  const timers: Array<{ callback: () => void; cancelled: boolean }> = [];
  const batches: PushNotification[][] = [];
  const errors: unknown[] = [];
  const stop = startPhonePushNotifier({
    inbox: { snapshot: () => snapshot, subscribe(next) { listener = next; return () => { listener = null; }; } },
    now: () => NOW,
    enabled: options.enabled ?? (() => true),
    send: options.send ?? (async (notifications): Promise<PhonePushOutcome> => { batches.push([...notifications]); return { kind: "sent", delivered: notifications.length }; }),
    setTimeout(callback) { const timer = { callback, cancelled: false }; timers.push(timer); return { cancel() { timer.cancelled = true; } }; },
    onError: (error) => errors.push(error)
  });
  return {
    stop, batches, errors,
    pending: () => timers.filter((timer) => !timer.cancelled).length,
    push(items: InboxItem[]) { snapshot = { items }; listener?.(snapshot); },
    async fire() { for (const timer of timers.splice(0)) if (!timer.cancelled) timer.callback(); await new Promise<void>((resolve) => setImmediate(resolve)); },
    listening: () => listener !== null
  };
}

test("phone notices reuse the desktop notice, clamp it, name who when the title does not, and map targets", () => {
  const needs = phonePushNotification(request("q"));
  assert.deepEqual(needs, { kind: "needs-you", id: "q", title: "Rex needs your approval", body: "Run npm test?", target: { kind: "thread", conversationId: "rex" } });
  const finished = phonePushNotification(outcome("outcome:rex:r"));
  assert.deepEqual(finished, { kind: "finished", id: "outcome:rex:r", title: "Fix the build", body: "Rex: All green", target: { kind: "thread", conversationId: "rex" } });
  assert.equal(phonePushNotification(outcome("o", null)).body, "Rex: Finished");
  assert.deepEqual(phonePushNotification(workflow).target, { kind: "inbox" });
  assert.equal(phonePushNotification(workflow).title, "Ship it needs you");
  assert.equal(phonePushNotification(workflow).body, "A stage failed.");
  const long = phonePushNotification(outcome("o", "word ".repeat(200)));
  assert.equal(long.body.length, PUSH_LIMITS.bodyMaxLength); assert.ok(long.body.endsWith("…"));
  for (const notice of [needs, finished, long, phonePushNotification(workflow), phonePushNotification(alert)]) pushNotificationSchema.parse(notice);
});

test("newly arrived needs-you items and finished threads are batched; items present at start, repeats and updates are not sent", async () => {
  const h = harness({ initial: [request("before"), outcome("old")] });
  h.push([request("before"), outcome("old"), request("one"), outcome("new")]);
  h.push([request("before"), outcome("old"), request("one"), outcome("new"), workflow]);
  assert.equal(h.batches.length, 0); assert.equal(h.pending(), 1);
  await h.fire();
  assert.deepEqual(h.batches.map((batch) => batch.map((notice) => notice.id)), [["one", "new", "workflow:run"]]);
  h.push([request("before"), outcome("old"), request("one"), outcome("new"), workflow]);
  await h.fire();
  assert.equal(h.batches.length, 1);
  h.stop(); assert.equal(h.listening(), false);
});

test("snoozed items wait and are sent when they wake", async () => {
  const h = harness();
  h.push([request("later", "2026-11-19T00:00:00.000Z")]);
  await h.fire(); assert.equal(h.batches.length, 0);
  h.push([request("later")]);
  await h.fire(); assert.deepEqual(h.batches.map((batch) => batch.map((notice) => notice.id)), [["later"]]);
});

test("a burst is split into requests of at most ten, sent without waiting", async () => {
  const h = harness();
  h.push(Array.from({ length: 23 }, (_, index) => request(`r${index}`)));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(h.batches.map((batch) => batch.length), [10, 10, 3]);
  assert.equal(h.pending(), 0);
});

test("nothing is sent while the setting is off", async () => {
  let enabled = false;
  const h = harness({ enabled: () => enabled });
  h.push([request("off")]);
  enabled = true;
  await h.fire(); assert.equal(h.batches.length, 0);
  h.push([request("off"), request("on")]);
  await h.fire(); assert.deepEqual(h.batches.map((batch) => batch.map((notice) => notice.id)), [["on"]]);
});

test("send failures, sync or async, are reported and never reach the inbox loop", async () => {
  let calls = 0;
  const h = harness({ send: (): Promise<PhonePushOutcome> => { calls += 1; if (calls === 1) throw new Error("sync"); return Promise.reject(new Error("async")); } });
  h.push([request("a")]); await h.fire();
  assert.doesNotThrow(() => h.push([request("a"), request("b")])); await h.fire();
  assert.deepEqual(h.errors.map((error) => error instanceof Error ? error.message : ""), ["sync", "async"]);
});

test("stopping cancels a pending batch", async () => {
  const h = harness();
  h.push([request("a")]);
  h.stop();
  assert.equal(h.pending(), 0);
  await h.fire(); assert.equal(h.batches.length, 0);
});
