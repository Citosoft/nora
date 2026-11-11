import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeActivity } from "@/components/app/logic/workspace-home/activity";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

function row(id: string, overrides: Partial<ThreadNavigationRow> = {}): ThreadNavigationRow {
  return { id, workspaceId: "project", title: id, target: { kind: "thread", conversationId: id }, providerKind: null,
    status: "Ready", active: false, working: false, unread: false, attention: false, pinned: false, selected: false,
    hasDraft: false, queuedCount: 0, updatedAt: "2026-11-11T10:00:00Z", ...overrides };
}

test("home prioritizes actionable work, limits rows, and counts the entire workspace", () => {
  const rows = [row("pinned", { pinned: true }), row("recent", { updatedAt: "2026-11-11T12:00:00Z" }),
    row("attention", { attention: true, active: true }), row("unread", { unread: true }), row("running", { active: true })];
  const original = structuredClone(rows);
  const activity = buildHomeActivity(rows);
  assert.deepEqual(activity.recent.map((entry) => entry.id), ["attention", "unread", "running", "pinned"]);
  assert.deepEqual({ total: activity.total, active: activity.active, attention: activity.attention, unread: activity.unread },
    { total: 5, active: 2, attention: 1, unread: 1 });
  assert.deepEqual(rows, original);
});

test("home derives only the selected workspace's unarchived threads and drafts", async () => {
  const fixture = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(fixture.deps);
  await store.refresh();
  store.openDraft({ workspaceId: "personal" });
  const state = store.snapshot();
  const personal = buildHomeActivity(buildThreadNavigation(state, "personal", "all"));
  assert.equal(personal.total, 2);
  assert.ok(personal.recent.every((entry) => entry.workspaceId === "personal"));
  assert.deepEqual(buildHomeActivity(buildThreadNavigation(state, "missing", "all")),
    { recent: [], total: 0, active: 0, attention: 0, unread: 0 });
});
