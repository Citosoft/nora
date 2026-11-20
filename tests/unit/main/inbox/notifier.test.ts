import assert from "node:assert/strict";
import test from "node:test";
import { describeInboxNotice, startInboxNotifier } from "@main/inbox/notifier";
import { describeAttention } from "@shared/conversations/attention";
import { snapshotBot } from "@shared/bots/snapshot";
import type { RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { InboxItem, InboxSnapshot } from "@shared/types/inbox/inbox.types";
import type { InboxNotice } from "@main/types/inbox/inbox.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";

const NOW = "2026-11-18T12:00:00.000Z";
const approval = (id: string): RuntimeRequest => ({ kind: "approval", id, runId: "r", attemptId: "a", nativeId: id,
  status: "pending", createdAt: NOW, expiresAt: "", title: "Run npm test?", options: [{ id: "allow", label: "Allow" }] });
const rex = conversation("rex", { bot: snapshotBot(bot("rex")) });
const request = (id: string, snoozedUntil: string | null = null): InboxItem => ({ kind: "request", id, workspaceId: "w", occurredAt: NOW, readAt: null, snoozedUntil,
  conversation: rex, request: approval(id), notice: describeAttention(rex, null, approval(id)) });
const outcome: InboxItem = { kind: "outcome", id: "o", workspaceId: "w", occurredAt: NOW, readAt: null, snoozedUntil: null, conversation: rex,
  run: { id: "r", state: "completed", createdAt: NOW, updatedAt: NOW, failure: null }, preview: "Done" };

test("notices name the waiting bot, and other needs-you items say what to do", () => {
  const nora = conversation("nora", { title: "Release prep" });
  const child = conversation("rex", { parentId: "nora", bot: snapshotBot(bot("rex")) });
  const group = conversation("group", { title: "Launch", group: { members: [], writer: null, hopLimit: 4 } as never });
  assert.deepEqual(describeAttention(child, nora, approval("q")), { conversationId: "rex", who: "Rex", title: "Rex needs your approval", body: "Run npm test? · asked by Nora" });
  assert.equal(describeAttention(child, group, approval("q")).body, "Run npm test? · in the group \"Launch\"");
  assert.deepEqual(describeInboxNotice({ kind: "workflow", id: "w", workspaceId: null, occurredAt: NOW, readAt: null, snoozedUntil: null, projectId: "p", runId: "run",
    workflowName: "Ship it", objective: "Ship", status: "paused", stopReason: "A stage failed." }),
  { target: { kind: "workflow", projectId: "p", runId: "run" }, who: "Ship it", title: "Ship it needs you", body: "A stage failed." });
  assert.deepEqual(describeInboxNotice({ kind: "connector", id: "c", workspaceId: null, occurredAt: NOW, readAt: null, snoozedUntil: null, connectorId: "c", name: "Linear" }).target,
    { kind: "connectors" });
});

test("each needs-you item notifies once as it arrives or wakes, only when allowed, and the badge counts what is waiting", () => {
  let snapshot: InboxSnapshot = { items: [request("before")] };
  let listener: ((next: InboxSnapshot) => void) | null = null;
  let focused = false;
  const notices: InboxNotice[] = [], badges: number[] = [];
  const stop = startInboxNotifier({ now: () => NOW, shouldNotify: () => !focused, notify: (notice) => notices.push(notice), setBadge: (count) => badges.push(count),
    inbox: { snapshot: () => snapshot, subscribe(next) { listener = next; return () => { listener = null; }; } } });
  const push = (items: InboxItem[]): void => { snapshot = { items }; listener?.(snapshot); };
  push([request("before"), request("one"), outcome]);
  push([request("before"), request("one"), outcome]);
  focused = true; push([request("before"), request("one"), request("two")]);
  focused = false; push([request("before", "2026-11-19T00:00:00.000Z"), request("one"), request("two")]);
  push([request("before"), request("one"), request("two")]);
  assert.deepEqual(notices.map((notice) => notice.title), ["Rex needs your approval", "Rex needs your approval"]);
  assert.deepEqual(badges, [1, 2, 2, 3, 2, 3]);
  stop();
  assert.equal(listener, null);
});
