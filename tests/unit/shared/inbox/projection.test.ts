import assert from "node:assert/strict";
import test from "node:test";
import { inboxCounts, inboxItemId, inboxTarget, inboxTier, projectInbox, trimPreview, unreadThreadIds } from "@shared/inbox/projection";
import { LOOP_USER_STOP_REASONS } from "@shared/loopRunLifecycle";
import { snapshotBot } from "@shared/bots/snapshot";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { InboxItem } from "@shared/types/inbox/inbox.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxLedger, InboxSources, InboxWorkflowSource } from "@shared/types/inbox/inbox.types";
import { bot } from "../bots/fixtures";
import { conversation } from "../../main/nora-tools/fixture";

const NOW = "2026-11-18T12:00:00.000Z";
const ledger = (marks: InboxLedger["marks"] = {}): InboxLedger => ({ version: 1, baselineAt: "2026-11-18T00:00:00.000Z", marks });
const finished = (entry: Conversation, runId: string, updatedAt: string, state: "completed" | "failed" | "running" = "completed"): ConversationSummary =>
  ({ conversation: entry, latestRun: { id: runId, state, createdAt: updatedAt, updatedAt, failure: null }, queuedCount: 0, pendingRequestCount: 0 });
const approval = (id: string, createdAt: string): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a", nativeId: id, status: "pending",
  createdAt, expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });
const workflow = (extra: Partial<InboxWorkflowSource>): InboxWorkflowSource => ({ projectId: "shell-w", workspaceId: "w", runId: "run", workflowName: "Ship it",
  objective: "Ship the fix", status: "paused", stopReason: "A stage failed.", updatedAt: "2026-11-18T10:00:00.000Z", ...extra });
const sources = (extra: Partial<InboxSources>): InboxSources => ({ summaries: [], requests: [], workflows: [], connectors: [], alerts: [], previews: new Map(), ...extra });

test("needs-you items come first, oldest first, then updates newest first", () => {
  const rex = conversation("rex", { bot: snapshotBot(bot("rex")) });
  const { snapshot } = projectInbox(sources({
    summaries: [finished(conversation("a"), "ra", "2026-11-18T08:00:00.000Z"), finished(conversation("b"), "rb", "2026-11-18T09:00:00.000Z")],
    requests: [{ conversation: rex, parent: null, request: approval("late", "2026-11-18T07:00:00.000Z") }, { conversation: rex, parent: null, request: approval("early", "2026-11-18T06:00:00.000Z") }],
    workflows: [workflow({})],
    connectors: [{ id: "c1", name: "Linear", enabled: true, status: "needs-auth" }, { id: "c2", name: "Off", enabled: false, status: "needs-auth" }]
  }), ledger(), NOW);
  assert.deepEqual(snapshot.items.map((item) => item.id), [inboxItemId.connector("c1"), inboxItemId.request("early"), inboxItemId.request("late"),
    inboxItemId.workflow("run", "paused", "2026-11-18T10:00:00.000Z"), inboxItemId.outcome("b", "rb"), inboxItemId.outcome("a", "ra")]);
  assert.deepEqual(inboxCounts(snapshot.items, NOW), { needsYou: 4, unread: 2 });
  assert.deepEqual(inboxTarget(snapshot.items[3]), { kind: "workflow", projectId: "shell-w", runId: "run" });
});

test("only top-level, unsettled, recent outcomes after the baseline become updates", () => {
  const { snapshot } = projectInbox(sources({ summaries: [
    finished(conversation("before"), "r1", "2026-11-17T23:00:00.000Z"),
    finished(conversation("child", { parentId: "parent" }), "r2", "2026-11-18T08:00:00.000Z"),
    finished(conversation("settled", { archivedAt: NOW }), "r3", "2026-11-18T08:00:00.000Z"),
    finished(conversation("stage", { source: { kind: "workflow", projectId: "p", runId: "x", stageId: "s" } }), "r4", "2026-11-18T08:00:00.000Z"),
    finished(conversation("busy"), "r5", "2026-11-18T08:00:00.000Z", "running"),
    finished(conversation("kept"), "r6", "2026-11-18T08:00:00.000Z", "failed")] }), ledger(), NOW);
  assert.deepEqual(snapshot.items.map((item) => item.id), [inboxItemId.outcome("kept", "r6")]);
});

test("marks apply per item: read and done updates, snoozes, and a later run returns as new", () => {
  const thread = conversation("thread");
  const first = inboxItemId.outcome("thread", "r1");
  const marks = { [first]: { readAt: NOW, doneAt: NOW } };
  assert.deepEqual(projectInbox(sources({ summaries: [finished(thread, "r1", "2026-11-18T08:00:00.000Z")] }), ledger(marks), NOW).snapshot.items, []);
  const later = projectInbox(sources({ summaries: [finished(thread, "r2", "2026-11-18T09:00:00.000Z")] }), ledger(marks), NOW);
  assert.deepEqual(later.snapshot.items.map((item) => [item.id, item.readAt]), [[inboxItemId.outcome("thread", "r2"), null]]);
  assert.deepEqual(later.marks, {}, "marks of items that left are dropped");
  assert.deepEqual(unreadThreadIds(later.snapshot.items), ["thread"]);
  const snoozed = projectInbox(sources({ summaries: [finished(thread, "r2", "2026-11-18T09:00:00.000Z")] }),
    ledger({ [inboxItemId.outcome("thread", "r2")]: { snoozedUntil: "2026-11-19T00:00:00.000Z" } }), NOW);
  assert.equal(snoozed.snapshot.items[0].snoozedUntil, "2026-11-19T00:00:00.000Z");
  assert.deepEqual(inboxCounts(snoozed.snapshot.items, NOW), { needsYou: 0, unread: 0 });
});

test("a needs-you item cannot be done or read away, and a workflow the user paused is not news", () => {
  const rex = conversation("rex");
  const id = inboxItemId.request("q");
  const { snapshot } = projectInbox(sources({ requests: [{ conversation: rex, parent: null, request: approval("q", NOW) }],
    workflows: [workflow({ stopReason: LOOP_USER_STOP_REASONS.paused }), workflow({ runId: "done", status: "completed", stopReason: null })] }),
    ledger({ [id]: { readAt: NOW, doneAt: NOW } }), NOW);
  assert.deepEqual(snapshot.items.map((item) => [item.id, item.readAt]), [[id, null], [inboxItemId.workflow("done", "completed", "2026-11-18T10:00:00.000Z"), null]]);
});

test("previews are flattened and trimmed for a list row", () => {
  assert.equal(trimPreview("  Done.\n\nAll   tests pass. "), "Done. All tests pass.");
  assert.equal(trimPreview("   "), null);
  assert.equal(trimPreview("x".repeat(400))?.length, 280);
});

test("an app alert is an inbox item that opens its app, in the tier the alert chose, keyed by when it fired", () => {
  const alert = { appId: "app-1", appName: "CRM", workspaceId: "w", alertId: "overdue", title: "2 invoices overdue", detail: "INV-101, INV-102", tier: "needs-you" as const, firedAt: "2026-11-19T10:00:00.000Z" };
  const { snapshot } = projectInbox(sources({ alerts: [alert, { ...alert, alertId: "big", title: "A big deal", detail: null, tier: "update" }] }), ledger(), "2026-11-19T11:00:00.000Z");
  const [needsYou, update] = snapshot.items;
  assert.equal(needsYou?.kind, "alert");
  assert.equal(needsYou?.id, "alert:app-1:overdue:2026-11-19T10:00:00.000Z");
  assert.equal(inboxTier(needsYou as InboxItem), "needs-you");
  assert.deepEqual(inboxTarget(needsYou as InboxItem), { kind: "app", appId: "app-1" });
  assert.equal(inboxTier(update as InboxItem), "update");
});
