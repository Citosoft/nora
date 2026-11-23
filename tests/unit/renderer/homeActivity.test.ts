import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeActivity, HOME_SECTION_LIMITS } from "@/components/app/logic/workspace-home/activity";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

function row(id: string, overrides: Partial<ThreadNavigationRow> = {}): ThreadNavigationRow {
  return { id, workspaceId: "project", title: id, target: { kind: "thread", conversationId: id }, providerKind: null,
    status: "Ready", active: false, working: false, unread: false, attention: false, pinned: false, selected: false,
    hasDraft: false, queuedCount: 0, updatedAt: "2026-11-11T10:00:00Z", ...overrides };
}

test("home splits threads into needs-you, in-progress and recent, newest first, each in one section", () => {
  const rows = [row("pinned", { pinned: true, updatedAt: "2026-11-11T09:00:00Z" }), row("recent", { updatedAt: "2026-11-11T12:00:00Z" }),
    row("attention", { attention: true, active: true }), row("waiting", { waitingOn: { name: "Bot", conversationId: "w" } }),
    row("unread", { unread: true }), row("running", { active: true }), row("working", { working: true, updatedAt: "2026-11-11T11:00:00Z" }),
    row("settled", { settled: true })];
  const original = structuredClone(rows);
  const activity = buildHomeActivity(rows);
  assert.deepEqual(activity.needsYou.map((entry) => entry.id), ["attention", "waiting"]);
  assert.deepEqual(activity.inProgress.map((entry) => entry.id), ["working", "running"]);
  assert.deepEqual(activity.recent.map((entry) => entry.id), ["recent", "unread", "pinned"]);
  assert.deepEqual({ total: activity.total, hidden: activity.hidden, unread: activity.unread }, { total: 8, hidden: 1, unread: 1 });
  assert.deepEqual(rows, original);
});

test("home caps each section and counts what it leaves to the sidebar", () => {
  const many = (prefix: string, count: number, overrides: Partial<ThreadNavigationRow>) =>
    Array.from({ length: count }, (_, index) => row(`${prefix}${index}`, { updatedAt: `2026-11-11T10:${String(index).padStart(2, "0")}:00Z`, ...overrides }));
  const activity = buildHomeActivity([...many("a", 8, { attention: true }), ...many("r", 10, {})]);
  assert.equal(activity.needsYou.length, HOME_SECTION_LIMITS.needsYou);
  assert.equal(activity.recent.length, HOME_SECTION_LIMITS.recent);
  assert.equal(activity.needsYou[0].id, "a7");
  assert.equal(activity.hidden, 18 - HOME_SECTION_LIMITS.needsYou - HOME_SECTION_LIMITS.recent);
});

test("home derives only the selected workspace's unarchived threads and drafts", async () => {
  const fixture = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(fixture.deps);
  await store.refresh();
  store.openDraft({ workspaceId: "personal" });
  const state = store.snapshot();
  const personal = buildHomeActivity(buildThreadNavigation(state, "personal", "all"));
  assert.equal(personal.total, 2);
  assert.ok([...personal.needsYou, ...personal.inProgress, ...personal.recent].every((entry) => entry.workspaceId === "personal"));
  assert.deepEqual(buildHomeActivity(buildThreadNavigation(state, "missing", "all")),
    { needsYou: [], inProgress: [], recent: [], total: 0, hidden: 0, unread: 0 });
});

test("home leaves out threads whose request, or whose worker's request, is answerable inline", () => {
  const rows = [row("asking", { attention: true }), row("parent", { waitingOn: { name: "Worker", conversationId: "worker" } }),
    row("worker", { attention: true, workThread: true }), row("failed", { attention: true, status: "Failed" }), row("idle")];
  const activity = buildHomeActivity(rows, new Set(["asking", "worker"]));
  assert.deepEqual(activity.needsYou.map((entry) => entry.id), ["failed"]);
  assert.deepEqual(activity.recent.map((entry) => entry.id), ["idle"]);
  assert.equal(activity.hidden, 0);
});
